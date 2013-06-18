/* ============================================================
 * 
 * Assemble has modified this code where indicated
 *
 * bootstrap-dropdown.js v2.0.0
 * http://twitter.github.com/bootstrap/javascript.html#dropdowns
 * ============================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ============================================================ */


!function ($) {

    "use strict"

    /* DROPDOWN CLASS DEFINITION
    * ========================= */

    var toggle = '[data-toggle="dropdown"]'
    , Dropdown = function (element) {
        var $el = $(element).on('click.dropdown.data-api', this.toggle)
        $('html').on('click.dropdown.data-api', function () {
            $el.parent().removeClass('open')
        })
    }

    Dropdown.prototype = {

        constructor: Dropdown

  , toggle: function (e) {
      var $this = $(this)
        , selector = $this.attr('data-target')
        , $parent
        , isActive
        , $window = $(window)
        , $menu
        , padding = 24
        , menuBottom
        , menuUpTop
        , scrolledBottom
        , menuRight
        , scrolledRight;

      if (!selector) {
          selector = $this.attr('href')
          selector = selector && selector.replace(/.*(?=#[^\s]*$)/, '') //strip for ie7
      }

      $parent = $(selector)
      $parent.length || ($parent = $this.parent())

      isActive = $parent.hasClass('open')


      // assemble change
      // 
      //    auto-adjust top when screen not tall enough
      //    auto-adjust left when screen not wide enough
      $menu = $parent.children('.dropdown-menu');

      if ($.browser.msie) {
          var preStyle = $menu.css('style') || '';
          $menu.css({ visibility: 'hidden', display: 'block' });
      }
      menuBottom = $parent.offset().top + $parent.height() + $menu.height() + padding;
      scrolledBottom = $window.height() + $window.scrollTop();
      menuUpTop = $parent.offset().top - $parent.height() - $menu.height();
      (menuBottom > scrolledBottom && menuUpTop >= $window.scrollTop()) ? $menu.addClass('bottom-up') : $menu.removeClass('bottom-up');

      menuRight = $parent.offset().left + $menu.width() + padding;
      scrolledRight = $window.width() + $window.scrollLeft();
      (menuRight > scrolledRight) || $menu.attr('data-menu-align') == 'right' ? $menu.addClass('right-left') : $menu.removeClass('right-left');
      if ($.browser.msie) { $menu.attr('style', preStyle); }
      // end assemble change

      clearMenus();
      !isActive && $parent.toggleClass('open');

      // assemble change
      $parent.trigger(!isActive ? 'opened' : 'closed', []);
      // end assemble change

      return false;
  }

    }

    function clearMenus() {
        var $parent = $(toggle).parent()
        if ($parent.hasClass('open')) {
            $parent
                .trigger('closed', [])
                .removeClass('open')
        }
    }


    /* DROPDOWN PLUGIN DEFINITION
    * ========================== */

    $.fn.dropdown = function (option) {
        return this.each(function () {
            var $this = $(this)
        , data = $this.data('dropdown')
            if (!data) $this.data('dropdown', (data = new Dropdown(this)))
            if (typeof option == 'string') data[option].call($this)
        })
    }

    $.fn.dropdown.Constructor = Dropdown


    /* APPLY TO STANDARD DROPDOWN ELEMENTS
    * =================================== */

    $(function () {
        $('html').on('click.dropdown.data-api', clearMenus)
        $('body').on('click.dropdown.data-api', toggle, Dropdown.prototype.toggle)
    })

} (window.jQuery)
