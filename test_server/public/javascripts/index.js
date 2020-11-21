import EditingWindow from './app'

const socket = io();

ReactDOM.render(<EditingWindow socket={socket}/>, document.getElementById('root'));