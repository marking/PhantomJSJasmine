(function ($) {
    var accounts = assemble.accounts = {};
    accounts.User = Backbone.Model.extend({
        urlRoot: '/Users/',
        
        idAttribute: 'Id',

        IsProjectAdministrator: function (projectId) {
            if (this.get('IsAdministrator')) return true;
            var roles = this.get('Roles');
            var isProjectAdministrator = _.any(roles, function (role) {
                // This 'Id' of '1' is totally hard coded to the 'Id' in the [Role]
                // table ... it should eventually be brought out and made dynamic on the backbone.js model end
                // but it's currently not ...
                return role.RoleId == 1 && role.ProjectId == projectId;
            });
            return this.get('IsAdministrator') || isProjectAdministrator;
        }

    });
    accounts.currentUser = null;
    accounts.hasCurrentUser = function () {
        return !(_.isNull(accounts.CurrentUser) || _.isUndefined(accounts.CurrentUser));
    };
})(jQuery);