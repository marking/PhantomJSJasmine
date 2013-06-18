(function ($) {
    
    var connection = assemble.connection = _.extend({}, Backbone.Events);        

    //enum for the different command codes manually synched 
    connection.CommandCode = {
        Geometry: 0,
        Materials: 1,
        GeometryCount: 2,
        GeometrySize: 3
    };

    connection.commandCodeString = function (command) {
        switch (command) {
            case this.CommandCode.Geometry:
                return "geometry";
            case this.CommandCode.Materials:
                return "materials";
            case this.CommandCode.GeometryCount:
                return "geometry count";
            default:
                return "unknown";
        }
    };

    connection.receiving = false;
    connection.totalBytes = 0;
        
    connection.obtainUrl = function (command, parameters) {
        var url = "/visualization/";
        switch (command) {
            case this.CommandCode.Geometry:
                url += "Geometry?modelVersionId=" + parameters.modelVersionId + "&skip=" + parameters.skip + "&take=" + parameters.take;                
                break;
            case this.CommandCode.Materials:
                url += "Materials";
                break;
            case this.CommandCode.GeometryCount:
                url += "GeometryCount?modelVersionId=" + parameters.modelVersionId;
                break;
            case this.CommandCode.GeometrySize:
                url += "GeometrySize?modelVersionId=" + parameters.modelVersionId;
                break;
        }
        return url;
    };

    connection.request = function(command, parameters, onloadFunction, onprogressFunction) {
        var url = this.obtainUrl(command, parameters);

        console.log("requesting geometry with url: " + url);        
        var self = this;
        self.totalBytes = 0;
        
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.responseType = "arraybuffer";
        xhr.onload = function() {
            if (this.status === 200) {
                var buffer = this.mozResponseArrayBuffer ? this.mozResponseArrayBuffer : this.response;                
                self.receiving = false;
                self.trigger("onload");
                if (typeof onloadFunction == "function")                
                    onloadFunction(buffer); 
            }
        };

        xhr.onprogress = function (e) {
            //var loaded = e.loaded;
            //self.totalBytes += e.loaded;
            //console.log("loaded " + e.loaded + " bytes");
            //console.log("loaded " + self.totalBytes + " bytes");
            if (typeof onprogressFunction == "function")            
                onprogressFunction(e);            
        };
        self.receiving = true;
        xhr.send();
    };

}(jQuery));