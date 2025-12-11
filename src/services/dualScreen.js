// sayon-frontend/src/services/dualScreen.js
const channel = new BroadcastChannel('sayon_pos_channel');

export const sendToCustomer = (type, data) => {
    channel.postMessage({ type, data });
};

export const listenForCustomer = (callback) => {
    channel.onmessage = (event) => {
        callback(event.data);
    };
};