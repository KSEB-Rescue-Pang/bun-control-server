import client from './client.js';
import handleAck from './handlers/ackHandler.js';

client.on('message', (topic, message) => {
  if (topic === 'esp/ack') {
    const data = JSON.parse(message.toString());
    handleAck(data);
  }
});

client.subscribe('esp/ack', { qos: 1 });
