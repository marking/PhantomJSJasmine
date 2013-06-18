describe("assemble", function () {

    describe("storage", function () {

        it("instantiates", function () {
            var userStorage = new assemble.UserStorage();
            expect(userStorage).toBeNotNull();
        });

        it("sets an object into local storage", function () {
            //arrange
            var testObj = { One: 1, Two: "Two" };
            var stringTestObj = JSON.stringify(testObj);
            var userStorage = new assemble.UserStorage();

            //act
            userStorage.setObject("key", testObj);

            //assert
            expect(localStorage.getItem("key")).toBe(stringTestObj);

            //cleanup
            localStorage.removeItem("key");
        });

        it("gets an object from local storage", function () {
            //arrange
            var testObj = { One: 1, Two: "Two" };
            var stringTestObj = JSON.stringify(testObj);
            localStorage.setItem("key", stringTestObj);
            var userStorage = new assemble.UserStorage();

            //act
            var storedObject = userStorage.getObject("key");

            //assert
            expect(storedObject.One).toBe(testObj.One);
            expect(storedObject.Two).toBe(testObj.Two);

            //cleanup
            localStorage.removeItem("key"); 
        });

        it("gets a fallback when object isn't in local storage", function() {
            //arrange
            var testObj = { One: 11, Two: "TwoTwo" };
            var userStorage = new assemble.UserStorage();

            //act
            var storedObject = userStorage.getObject("key", testObj);

            //assert
            expect(storedObject.One).toBe(testObj.One);
            expect(storedObject.Two).toBe(testObj.Two);

            //cleanup
            localStorage.removeItem("key");  

        });

        it("has an object from local storage", function () {
            localStorage.setItem("key", "blah");

            var userStorage = new assemble.UserStorage();
            var hasIt = userStorage.hasObject("key");

            expect(hasIt).toBeTruthy();
            localStorage.removeItem("key");
        });

        it("doesn't have an object from local storage", function () {
            localStorage.setItem("key2", "blah");

            var userStorage = new assemble.UserStorage();
            var hasIt = userStorage.hasObject("key");

            expect(hasIt).toBeFalsy();
            localStorage.removeItem("key2");
        });

    });

});