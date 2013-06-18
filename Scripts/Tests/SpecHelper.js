
function defineGlobals() {

    assemble.mvcRoutes = {
        modelEditSave: function () { return "/Models/Update"; },  
        modelEditModal: function () { return "/Models/Update"; },
        materials: function () { return "/Visualization/Materials"; }
    };

    sinon.stub($.fn, 'effect');


    assemble.loadFixture = function(path) {
        return $.ajax(path, {
            async: false,
            success: function (result) {
                $('head').append(result);
                assemble.templates.process();
            }
        });
    };
}

defineGlobals();

beforeEach(function () {
    $.ajaxSetup({ async: false });
    this.addMatchers({
        toBeNotNull: function () {
            return this.actual != null;
        },
        toBeInstanceOf: function (instanceType) {
            return this.actual instanceof instanceType;
        }
    });
});

var Factory = {
    factories: {},

    define: function (name, klass, defaults) {

        if (klass.isFactoryObject) {
            Factory.factories[name] = function (overrides) {
                return klass(_.extend(defaults, overrides || {}));
            };
        } else {
            Factory.factories[name] = function (overrides) {
                return new klass(_.extend(defaults, overrides || {}));
            };
        }

        Factory.get(name).isFactoryObject = true;

    },

    create: function (name, overrides) {
        return Factory.get(name)(overrides);
    },

    get: function (name) {
        return Factory.factories[name];
    }
};

var MockData = {
  
    geometryArrayBuffer: function () {
        //TODO: update with latest structure
        var buffer = new ArrayBuffer(100);
        
        var uint8 = new Uint8Array(buffer);
        
        var ptr = 0;  
        
        uint8[ptr++] = 1;  //little endianness      
        
        uint8[ptr++] = 1; //with faces

        uint8[ptr] = 1; //count total geometry        
        ptr += 2;
        
        uint8[ptr] = 1; //count category groups
        ptr += 4;

        uint8[ptr] = 14; //category = "Generic Models"         
        ptr += 4;
        uint8[ptr++] = 71; //G
        uint8[ptr++] = 101; //e
        uint8[ptr++] = 110; //n
        uint8[ptr++] = 101;  //e
        uint8[ptr++] = 114; //r
        uint8[ptr++] = 105; //i
        uint8[ptr++] = 99; //c
        uint8[ptr++] = 32; //space
        uint8[ptr++] = 77; //M
        uint8[ptr++] = 111; //o
        uint8[ptr++] = 100; //d
        uint8[ptr++] = 101; //e
        uint8[ptr++] = 108; //l
        uint8[ptr++] = 115; //s

        ptr += 2;

        uint8[ptr] = 1; //count geometries in category group
        ptr += 4;

        var value = 167531;  //id
        for (var index = 0; index < 4; index++) {
            var b = value & 0xff;
            uint8[ptr+index] = b;
            value = (value - b) / 256;
        }
        
        ptr += 4;

        uint8[ptr] = 2; //count vertices                
        ptr += 4;

        var tempBuffer = new ArrayBuffer(4);
        var floatBuffer = new Float32Array(tempBuffer);
        var uintBuffer = new Uint8Array(tempBuffer);
        floatBuffer[0] = 1;
        
        uint8[ptr++] = uintBuffer[0];  //v1_x
        uint8[ptr++] = uintBuffer[1];
        uint8[ptr++] = uintBuffer[2];
        uint8[ptr++] = uintBuffer[3];
        
        uint8[ptr] = 0; //v1_y
        ptr += 4;
        uint8[ptr] = 0; //v1_z
        ptr += 4;
        uint8[ptr] = 0;  //v2_x
        ptr += 4;
        
        uint8[ptr++] = uintBuffer[0];  //v1_y
        uint8[ptr++] = uintBuffer[1];
        uint8[ptr++] = uintBuffer[2];
        uint8[ptr++] = uintBuffer[3];
        
        uint8[ptr] = 0; //v2_z
        ptr += 4;
        
        uint8[ptr] = 1;  //face count
        ptr += 4;

        uint8[ptr] = 3;  //index count
        ptr += 4;
        uint8[ptr] = 1;  //I_1
        ptr += 2;
        uint8[ptr] = 0;  //I_2
        ptr += 2;
        uint8[ptr] = 1;  //I_3     
        return buffer;
    },
    
    //TODO: small model binary in a separate file.
  };

