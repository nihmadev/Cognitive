// Test file to verify Monaco Editor diagnostics are working

// This should show an error - variable declared but never used
const unusedVariable = "I am not used";

// This should show an error - type mismatch
const numberValue: number = "this is a string";

// This should show an error - missing semicolon is actually fine in TS
const missingType = 123

// This should show an error - calling undefined function
nonExistentFunction();

// This should show an error - accessing property on undefined
const obj = undefined;
obj.someProperty;

// This should show a warning - unreachable code
function testFunction() {
    return true;
    console.log("This line is unreachable");
}

// This should work fine - no errors
const validCode: string = "Hello, World!";
console.log(validCode);

export {};
