import client from './client.js';

export function publishSchedule(shelfId, payload) {
  const topic = `server/${shelfId}/assign`;
  client.publish(topic, JSON.stringify(payload), { qos: 1, retain: false });
}
