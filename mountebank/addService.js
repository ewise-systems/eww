const fetch = require('node-fetch');

const addService = (port, contract) =>
    fetch(`http://127.0.0.1:${port}/imposters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contract)
    });

module.exports = {
    addService
};