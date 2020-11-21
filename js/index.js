import App from './app.js'
// import io from 'socket.io-client';
const socket = io();
ReactDOM.render(<App />, document.getElementById('root'));