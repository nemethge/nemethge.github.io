// Véletlenszerű jelszavak generálása random és urandom használatával
function getRandomChar(characters) {
    return characters[Math.floor(Math.random() * characters.length)];
}

function generateSimplePassword() {
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
        password += getRandomChar(characters);
    }
    document.getElementById('password').value = password;
}

function generateStrongPassword() {
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+{}|:<>?-=[];,./';
    let password = '';
    for (let i = 0; i < 12; i++) {
        password += getRandomChar(characters);
    }
    document.getElementById('password').value = password;
}

function copyPassword() {
    const password = document.getElementById('password');
    password.select();
    password.setSelectionRange(0, 99999); // Mobil támogatás
    document.execCommand("copy");
    alert("Jelszó másolva a vágólapra: " + password.value);
}
