#include <iostream>
#include <string>

// use the standard namespace to avoid writing std:: before cin and cout
using namespace std;

int main() {
    // Output a prompt to the screen
    cout << "Enter your name and age: " << endl;

    string name;
    int age;

    // Take input from the keyboard and store it in variables
    cin >> name >> age;

    // Output the stored values to the screen
    cout << "Hello, " << name << "! You are " << age << " years old." << endl;

    return 0;
}
