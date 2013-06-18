
(function (assemble, $) {

    function Diagonal() {
        this.reset();
    }

    Diagonal.prototype.encounter = function (x, y, z) {
        this.set = true;
        this.minX = x < this.minX ? x : this.minX;
        this.minY = y < this.minY ? y : this.minY;
        this.minZ = z < this.minZ ? z : this.minZ;
        this.maxX = x < this.maxX ? this.maxX : x;
        this.maxY = y < this.maxY ? this.maxY : y;
        this.maxZ = z < this.maxZ ? this.maxZ : z;
    };

    Diagonal.prototype.encounterDiagonal = function (d) {
        this.encounter(d.minX, d.minY, d.minZ);
        this.encounter(d.maxX, d.maxY, d.maxZ);
    };

    Diagonal.prototype.length = function () {
        var dx = this.maxX - this.minX;
        var dy = this.maxY - this.minY;
        var dz = this.maxZ - this.minZ;

        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    };

    Diagonal.prototype.isSet = function () {
        return this.set;
    };
        
    Diagonal.prototype.reset = function () {
        this.minX = Infinity;
        this.minY = Infinity;
        this.minZ = Infinity;
        this.maxX = -Infinity;
        this.maxY = -Infinity;
        this.maxZ = -Infinity;
        this.set = false;
    };

    assemble.Diagonal = Diagonal;

}(window.assemble, jQuery));
