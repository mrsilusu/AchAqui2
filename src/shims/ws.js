const ReactNativeWebSocket = global.WebSocket;

if (!ReactNativeWebSocket) {
  throw new Error('WebSocket global não disponível neste runtime React Native.');
}

module.exports = ReactNativeWebSocket;
module.exports.default = ReactNativeWebSocket;
module.exports.WebSocket = ReactNativeWebSocket;
