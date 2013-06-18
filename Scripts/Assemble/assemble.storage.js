(function ($, assemble) {

    var UserStorage = function () {
    };

    function getObject(key, fallback) {

        if (hasObject(key))
            return JSON.parse(localStorage.getItem(key));
        else if (fallback === undefined)
            return null;
        else
            return fallback;
    }

    function setObject(key, obj) {
        localStorage.setItem(key, JSON.stringify(obj));
    }

    function hasObject(key) {
        return localStorage.getItem(key) != null;
    }

    UserStorage.prototype.getObject = getObject;
    UserStorage.prototype.setObject = setObject;
    UserStorage.prototype.hasObject = hasObject;

    assemble.UserStorage = UserStorage;
    assemble.userStorage = new UserStorage();

})(jQuery, window.assemble);