const form = document.getElementById('regform');
form.addEventListener('submit', registerUser)

async function registerUser(event){
    event.preventDefault()
    const username = document.getElementById('username').value
    const password = document.getElementById('password').value

    const result = await fetch('/api/register', {
        method: 'POST',
        headers: {
            'Content-type' : 'application/json'
        },
        body: JSON.stringify({
            username,
            password
        })
    }).then((res)=> res.json())
    console.log(result)
}
