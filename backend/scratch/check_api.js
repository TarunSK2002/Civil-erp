async function check() {
    try {
        const res = await fetch('http://localhost:5000/api/attendance-sheets/2');
        if (!res.ok) {
            console.error('Status:', res.status);
            const text = await res.text();
            console.error('Body:', text);
        } else {
            console.log('Success!');
        }
    } catch (err) {
        console.error(err);
    }
}
check();
