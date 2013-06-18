describe("assemble", function () {

    it("exists", function () {
        expect(assemble).toBeNotNull();
    });

    describe("logicSwitcher", function () {

        it("exists", function () {
            expect(assemble.logicSwitch).toBeNotNull();
        });

        it("instatiates", function () {
            //arrange
            var on = function () {
            };
            var off = function () {
            };

            //act
            var logicSwitch = new assemble.logicSwitch(on, off, this);

            //assert
            expect(logicSwitch.onCallBack.original).toBe(on);
            expect(logicSwitch.offCallBack.original).toBe(off);
            expect(logicSwitch.state).toBeNull();
        });

        it("transitions to 'on'", function () {
            //arrange
            var functions = {
                on: function () { },
                off: function () { }
            };
            var mock = sinon.mock(functions).expects("on").once();

            //act
            var logicSwitch = new assemble.logicSwitch(functions.on, functions.off, this);
            logicSwitch.on();

            //assert
            mock.verify();
            expect(logicSwitch.state).toBe("on");
        });

        it("does not allow on called multiple times in a row", function () {
            //arrange
            var functions = {
                on: function () { },
                off: function () { }
            };
            var mock = sinon.mock(functions).expects("on").once();

            //act
            var logicSwitch = new assemble.logicSwitch(functions.on, functions.off, this);
            logicSwitch.on();
            logicSwitch.on();

            //assert
            mock.verify();
        });

        it("transitions to 'off' from 'on'", function () {
            //arrange 
            var functions = {
                on: function () { },
                off: function () { }
            };
            var onMock = sinon.mock(functions).expects("on").once();
            var offMock = sinon.mock(functions).expects("off").once();

            //act
            var logicSwitch = new assemble.logicSwitch(functions.on, functions.off, this);
            logicSwitch.on();
            logicSwitch.off();

            //assert
            onMock.verify();
            offMock.verify();
            expect(logicSwitch.state).toBe("off");
        });

        it("does not transition to 'off' from initial state", function () {
            //arrange
            var functions = {
                on: function () { },
                off: function () { }
            };
            var mock = sinon.mock(functions).expects("off").never();

            //act
            var logicSwitch = new assemble.logicSwitch(functions.on, functions.off, this);
            logicSwitch.off();

            //assert
            mock.verify();
            expect(logicSwitch.state).toBeNull();
        });

        it("transitions to 'on' from 'off'", function () {
            //arrange 
            var functions = {
                on: function () { },
                off: function () { }
            };
            var onMock = sinon.mock(functions).expects("on").twice();
            var offMock = sinon.mock(functions).expects("off").once();

            //act
            var logicSwitch = new assemble.logicSwitch(functions.on, functions.off, this);
            logicSwitch.on();
            logicSwitch.off();
            logicSwitch.on();

            //assert
            onMock.verify();
            offMock.verify();
            expect(logicSwitch.state).toBe("on");
        });

        it("does not allow off multiple times in a row", function () {
            //arrange 
            var functions = {
                on: function () { },
                off: function () { }
            };
            var onMock = sinon.mock(functions).expects("on").once();
            var offMock = sinon.mock(functions).expects("off").once();

            //act
            var logicSwitch = new assemble.logicSwitch(functions.on, functions.off, this);
            logicSwitch.on();
            logicSwitch.off();
            logicSwitch.off();

            //assert
            onMock.verify();
            offMock.verify();
            expect(logicSwitch.state).toBe("off");
        });
    });

    describe("status", function () {

        describe("updateFromResponseError", function () {

            it("passes valid message and status on to updateStatus", function () {
                var result = { Message: "Valid Message", Status: "KnownError" };
                var response = { responseText: JSON.stringify(result) };
                var update = sinon.mock(assemble.status).expects("update").withExactArgs("Valid Message", "error").once();
                assemble.status.updateFromResponseError(response);
                update.verify();
                assemble.status.update.restore();
            });

            it("falls back to default message on unexpected response", function () {
                var response = { }; //not good
                var update = sinon.mock(assemble.status).expects("update").withExactArgs("An unknown error occurred.", "error").once();
                assemble.status.updateFromResponseError(response);
                update.verify();
                assemble.status.update.restore();
            });

        });

    });
});