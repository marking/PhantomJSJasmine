$(document).ready(function () {
    var logger = log4javascript.getLogger();

    var ajaxAppender = new log4javascript.AjaxAppender("/Logging");
    var consoleAppender = new log4javascript.BrowserConsoleAppender();

    logger.addAppender(ajaxAppender);
    logger.addAppender(consoleAppender);

    window.onerror = function (message, url, lineNumber) {
        // + JSON.stringify(assemble) // stringify this object for debug later?
        logger.fatal(message + "in " + url + ", on line: " + lineNumber + "\r\n\r\n" + location.href);
    };

    assemble.browser.identify();

    // compile and namespace any templates on the page
    assemble.templates.process();

    Backbone.Model.prototype.parse = function (response) {
        if (response.redirect) {
            window.location = response.redirect;
            return true;
        } else {
            return Backbone.Collection.prototype.parse.call(this, response);
        }
    };


    // MOVE THIS: setup see more/less functionality for big text areas
    $(document)
        .delegate(".see-more-text", 'click', function (event) {
            $(this)
                .parent('.some-text').hide()
                .siblings('.all-text').show();
        })
        .delegate(".see-less-text", 'click', function (event) {
            $(this)
                .parent('.all-text').hide()
                .siblings('.some-text').show();
        });
});

(function (assemble, $, undefined) {
    assemble.app = _.extend({}, Backbone.Events);

    Handlebars.templates = { };

    assemble.mvcRoutes = {
        extend: function (routes) {
            _.each(routes, function (value, key, list) {
                list[key] = Handlebars.compile(value);
            });
            _.extend(this, routes);
            return this;
        }
    };
    assemble.modules = {};

    // If javascript behavior is used only in targeted areas ... move that in to their javascript specific files (see: ~/Scripts/Projects/assemble.projects.js).

    assemble.form = (function () {

        var setFocus = function (contextElement) {
            var $contextElement = $(contextElement || document);
            var initialFocus = $contextElement.find(".initial-focus").focus();
            if (!initialFocus.length) $contextElement.find(":input:first").focus();
        };

        $(document).ready(function () { setFocus(); });

        return {
            setFocus: setFocus
        };
    }());

    assemble.status = (function () {
        var contentSelector = "#status_message",
            update,
            loading,
            removeEverything,
            loadingShown,
            updateFromResponseError,
            removeTimer;

        update = function (message, messageType) {
            messageType = messageType || 'message';
            var alertElement = assemble.messaging.createMessage(messageType),
                $contentSelector = $(contentSelector);

            if (removeTimer) clearTimeout(removeTimer);
            
            if (!message || message === '') {
                removeEverything();
            } else {
                removeEverything();
                $contentSelector.html(alertElement.html(message));
                if (messageType == 'success') {
                    removeTimer = setTimeout(function() {
                        alertElement.fadeOut('fast', function() {
                            $(this).remove();
                        });
                    }, 5000);
                }
            }

            loadingShown = false;
            return $contentSelector;
        };

        updateFromResponseError = function (response) {
            try {
                if (response.statusText != "abort") {
                    var result = JSON.parse(response.responseText);
                    assemble.status.update(result.Message, "error");
                }                
            }
            catch (ex) {
                assemble.status.update("An unknown error occurred.", "error");
            }
        };

        loading = function (isLoading, message) {
            if (isLoading) {
                update(message || 'Loading...');

                // loadingShown has to be truthed after we update so we don't overwrite loadingShown
                loadingShown = true;
            } else if (loadingShown) {
                removeEverything();
                loadingShown = false;
            }
        };

        removeEverything = function () {
            $(contentSelector).empty();
        };
        
        // setup ajax loading message
        $(document)
            .ajaxStart(function () { loading(true); })
            .ajaxStop(function () { loading(false); });

        return {
            update: update,
            loading: loading,
            updateFromResponseError: updateFromResponseError
        };
    }());

    assemble.messaging = (function () {
        var messaging = {};

        // can take messageType, messageText
        // - OR -
        // object with messageType and messageText properties
        messaging.createMessage = function (messageType, messageText) {
            var message = messageType;
            if (!$.isPlainObject(message)) {
                message = {
                    messageText: messageText || '',
                    messageType: messageType || 'message'
                };
            }

            return $('<div class="alert alert-' + message.messageType + '">' + message.messageText + '</div>');
        };

        return messaging;
    }());

    assemble.modal = (function () {

        var show = function (url, element, callback) {
            $.get(url, {}, function (data) {
                var $modalElement = $(data);
                var $element = element !== null ? $(element) : $();

                // 550 comes from the responsiveness styles for modal sizing
                if ($(window).width() < 550) {
                    window.scrollTo(0, 0);
                }

                $modalElement.modal({ backdrop: 'static' });

                assemble.app.trigger('modal.show', { $modalElement: $modalElement });

                // setup the form
                $.validator.unobtrusive.parse($modalElement);
                assemble.form.setFocus($modalElement);


                if ($element.attr("data-help-key") !== undefined) {
                    assemble.help.mainrepository.load(function (helpConfig) {
                        new assemble.help.KeyView({ model: helpConfig, el: $modalElement.find(".help-link")[0], key: $element.attr("data-help-key") });
                    });
                }

                if (callback != null)  //!== does not work here
                    callback({ $modalElement: $modalElement });
            });
        };

        // needs id, title, primaryButtonText
        Handlebars.templates.modal = Handlebars.compile(
            '<div id="{{id}}" class="modal" style="display: none;">' +
                '{{#if withForm}}<form>{{/if}}' +
                '<div class="modal-header">' +
                    '<a class="close" data-dismiss="modal">×</a>' +
                    '<h3>{{title}}<a href="#" style="display:none" class="mls help-link" target="_assemble_extra"><i class="icon-help-blue"></i></a></h3>' +
                '</div>' +
                '<div class="modal-body">' +
                '</div>' +
                '<div class="modal-footer">' +
                    '{{#if withForm}}<input type="submit" value="{{primaryButtonText}}" class="btn {{#if primaryButtonClass}}{{primaryButtonClass}}{{else}}btn-primary{{/if}}" />' +
                    '{{else}}<a href="#" class="btn {{#if primaryButtonClass}}{{primaryButtonClass}}{{else}}btn-primary{{/if}}">{{primaryButtonText}}</a>{{/if}}' +
                    '<a href="#" class="btn cancel" data-dismiss="modal">Cancel</a>' +
                '</div>' +
                '{{#if withForm}}</form>{{/if}}' +
            '</div>'
        );

        var create = function (config) {
            var modal = $(Handlebars.templates.modal(config));

            modal.modal({ backdrop: 'static' })
                    .on('hidden', function () { $(this).remove(); });

            return modal;
        };

        // setup event handler when clicking an item that asks for a modal
        $(document).delegate('.open-modal', 'click', function (event) {
            event.preventDefault();
            show(this.href, this);
        });

        return {
            show: show,
            create: create
        };
    }());

    assemble.templates = {
        process: function () {
            var base = Handlebars.templates || (Handlebars.templates = {});

            $('[type="text/template"], [type="text/template-partial"]').each(function () {
                var elem = $(this),
                    namespaces = elem.attr('data-namespace'),
                    current = base,
                    setNamespace,
                    template = elem.templatize();

                if (!namespaces) return;

                // register as a partial if a partial, but keep going and namespace them as full templates
                if (elem.attr('type') == 'text/template-partial') Handlebars.registerPartial(namespaces, template);
                
                namespaces = namespaces.split('.');

                setNamespace = function (obj, property) {
                    if (_.indexOf(namespaces, property) == (namespaces.length - 1)) {
                        obj[property] = template;
                    } else if (!obj[property]) {
                        obj[property] = {};
                    }
                    return obj[property];
                };

                _.each(namespaces, function (namespace) {
                    current = setNamespace(current, namespace);
                });
            });

            $('[type="text/template-partial"]').each(function() {
                var elem = $(this),
                    name = elem.attr('data-namespace');
                    
                if (!name) return;

                Handlebars.registerPartial(name, elem.templatize());
            });
        }
    };

    // requires defintion of:
    // this.searchInput
    // this.getItems()

    assemble.modules.search = {
        searchUpdated: function (event) {
            event = event || {};
            var self = this;
            if (event.keyCode == 40 && this.downToList) {
                event.preventDefault();
                this.downToList();
            }

            setTimeout(function () { self.search(self.searchInput.val()); }, 1);
        },

        search: function (query) {
            var self = this,
                idProp = this.idProperty,
                searchProp = this.searchProperty;

            query = query.toLowerCase();
            this.getSelectableItems().hide();

            this.collection.each(function (item) {
                var matched = item.attributes[searchProp].toLowerCase().indexOf(query) != -1;

                if (matched) {
                    self.items[item.attributes[idProp]].show();
                }
            });

            // if we have dividers
            if (this.dividerBefore) {
                this.$('.divider').each(function() {
                    var $el = $(this),
                        hasItemOnBothSides = $el.prev(':visible:not(.divider)').length && $el.next(':visible:not(.divider)').length;

                    hasItemOnBothSides ? $el.show() : $el.hide();
                });
            }
            
            if (this.trigger) {
                this.trigger('search.done');
            }
        },

        resetSearch: function () {
            this.searchInput.val('');
            this.search('');
        }
    };

    assemble.logicSwitch = function (onCallBack, offCallBack, context) {
        this.onCallBack = _.bind(onCallBack, context);
        this.onCallBack.original = onCallBack;
        this.offCallBack = _.bind(offCallBack, context);
        this.offCallBack.original = offCallBack;
        this.state = null;
    };

    assemble.logicSwitch.prototype.off = function () {
        if (this.state === "on") {
            this.offCallBack();
            this.state = "off";
        }
    };

    assemble.logicSwitch.prototype.on = function () {
        if (this.state != "on") {
            this.onCallBack();
            this.state = "on";
        }
    };

    // identify is run for every page
    //   it adds classes to the html node that identify for special circumstances
    //   so far we get (where applicable): ipad, ie, ie# where # is the version number, goodbrowser, badbrowser
    assemble.browser = (function() {
        var valid = true;

        var invalidMessage = "You're using an unsupported browser, and may experience problems.";

        var warn = function() {

            if (!assemble.browser.goodbrowser) {
                $(document.body).prepend(
                    '<div class="alert alert-error environment-alert">' +
                        invalidMessage + ' Please consult the <a href="#" id="webClientRequirements">Web Client Requirements</a> documentation for more information.' +
                            '</div>');
            }
            
            assemble.help.mainrepository.load(function(helpConfig) {
                new assemble.help.KeyView({ model: helpConfig, el: $("#webClientRequirements"), key: "10005" });
            });
        };

        var identify = function() {
            var browser = $.browser,
                version = $.browser.version,
                classes = [];

            if (navigator.userAgent.match( /iPad/i ) !== null) {
                // cool with ipad
                classes.push('ipad');
            } else if (!(browser.msie || browser.webkit || browser.mozilla)) {
                // if not ie, webkit, ff, no good
                valid = false;
            } else if (browser.msie) {
                // c'mon IT
                classes.push('ie');
                classes.push('ie' + parseInt(version, 10));
                if (parseInt(version, 10) <= 8) {
                    invalidMessage = 'You\'re using an unsupported version of IE or you are running in compatibility mode. ';
                    valid = false;
                }
            } else if (browser.safari && navigator.userAgent.match( /Chrome/ ) === null) {
                // not yet supporting safari, unless iPad
                valid = false;
            }

            classes.push(valid ? 'goodbrowser' : 'badbrowser');

            _.each(classes, function(klass) {
                assemble.browser[klass] = true;
            });
            
            $('html').addClass(classes.join(' '));
        };

        return {
            identify: identify,
            warn: warn
        };
        
    })();

    assemble.mask = function(value, maskType) {
        
        var masks = {
            currency: function(input) {
                return (+input).toFixed(2);
            }
        };
        
        if (!$.isFunction(masks[maskType])) throw new Error(maskType + ' is not a defined mask function.');

        return masks[maskType](value);
    };

    assemble.numbers = {
        delimit: function (number, delimiter) {
            delimiter = delimiter || ","; // replace comma if desired

            return (number + "").replace(/\b(\d+)((\.\d+)*)\b/g, function(a, b, c) {
                return (b.charAt(0) > 0 && !(c || ".").lastIndexOf(".") ? b.replace(/(\d)(?=(\d{3})+$)/g, "$1" + delimiter) : b) + c;
            });
        },
        
        undelimit: function(string, delimiter) {
            delimiter = delimiter || ',';
            var pattern = new RegExp("\\"+delimiter, "g");
            return parseFloat(string.replace(pattern, ''));
        }
    };

    // ugh fix for error loading Modernizr in IE9 on a Microsoft Windows Server 2008 R2 box
    // if Modernizr didn't load for some reason, at least don't error out when doing something like Modernizr.touch
    if (Modernizr === undefined) Modernizr = {};

}(window.assemble = window.assemble || {}, jQuery));


// jquery configuration/add-ons
(function ($) {
    $.ajaxSetup({
        error: function (jqXHR, textStatus, errorThrown) {
            assemble.status.update('An error occurred. Please try again.', 'error');
        },
        cache: false
    });

    $.fn.radioClass = function (cssClass) {
        return this.each(function () {
            $(this)
                .addClass(cssClass)
                .siblings('.' + cssClass)
                    .removeClass(cssClass);
        });
    };

    $.fn.showWorkingText = function (show) {
        return this.each(function () {
            show = show === false ? false : true;
            var button = $(this),
                loadingText = button.attr('data-working-text'),
                originalText = button.data('original-text');

            if (show && loadingText) {
                if (!originalText) {
                    button.data('data-original-text', button.val());
                }
                button.val(loadingText);
            } else if (!show && originalText) {
                button.val(originalText);
            }
        });
    };
    
    // Serialize a form into an object a la http://stackoverflow.com/questions/1184624/convert-form-data-to-js-object-with-jquery
    $.fn.serializeObject = function() {
        var o = {};
        var a = this.serializeArray();
        $.each(a, function() {
            if (o[this.name] !== undefined) {
                if (!o[this.name].push) {
                    o[this.name] = [o[this.name]];
                }
                o[this.name].push(this.value || '');
            } else {
                o[this.name] = this.value || '';
            }
        });
        return o;
    };

    $.fn.absolutize = function (rebase) {
        return this.each(function () {
            var el = $(this);
            var pos = el.position();
            el.css({
                position: "absolute",
                marginLeft: 0,
                marginTop: 0,
                top: pos.top,
                left: pos.left
            });
            if (rebase)
                el.remove().appendTo("body");
        });
    };

    $.fn.templatize = function() {
        return Handlebars.compile($(this[0]).remove().html());
    };

    $.fn.slideMenu = function(method) {
        var methods = {
            resetPosition: function(el) {
                var menuList = el.find(".menu-items"),
                    top = el.css('top'),
                    before = el.prev(),
                    after = el.next(),
                    parent = el.parent(),
                    initialMargin;

                // remove from current place, put it in the dom, size it up, put it back
                el
                    .hide()
                    .appendTo($(document.body))
                    .css('top', -50000)
                    .show();

                initialMargin = -1 * (menuList.outerWidth() - el.find('.trigger').width() + 12);

                if (before.length) {
                    el.insertAfter(before);
                } else if (after.length) {
                    el.insertBefore(after);
                } else {
                    el.appendTo(parent);
                }
                el.css('top', top);
                // puttin' it back done

                // setting the initial margin
                el.css(el.hasClass('slide-menu-right') ? 'margin-right' : 'margin-left', initialMargin);
            }
        };
        
        return this.each(function() {
            var el = $(this);

            if (method && methods[method]) {
                methods[method](el);
                return;
            }

            methods.resetPosition(el);

            var clickOff = function(e) {
                var target = $(e.target || e.srcElement || e.originalTarget);
                if (!target.hasClass('.slide-menu') && !target.parents('.slide-menu').length) {
                    $(".slide-menu").removeClass("active");
                    $(document).off('click', clickOff);
                }
            };

            el
                .hover(function() { el.addClass("active"); }, function() { el.removeClass("active"); })
                .on('click', function(e) {
                    var target = $(e.target || e.srcElement || e.originalTarget);
                    
                    // close other slide-menus
                    $(".slide-menu").not(el).removeClass("active");
                    
                    if (target.hasClass('menu-items') || target.parents('.menu-items').length) return;
                    $(document).off('click', clickOff);
                    
                    el.toggleClass("active");
                    if (el.hasClass('active')) {
                        $(document).on('click', clickOff);
                    }
                });
        });
    };
} (jQuery));

// handlebars helpers
(function(h) {
    
    // renderPartial allows you to send in a namespace or even just a known prefix for a partial, instead of just a static name
    Handlebars.registerHelper('renderPartial', function(name, context) {
        var prefix, partial;
        
        prefix = context.hash.namespace ? context.hash.namespace + '.' : '';
        partial = Handlebars.partials[(prefix + name)];
        if (!$.isFunction(partial)) partial = Handlebars.compile(partial);
        context = $.extend({}, this, context.hash);

        return new Handlebars.SafeString(partial(context));
    });
}(Handlebars));

/* console fix for IE */
if (typeof console == 'undefined') {
    console = {
        dir: function () { },
        log: function () { }
    };
}