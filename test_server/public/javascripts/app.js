import app from "../../app";

class EditingWindow extends React.Component {
    socket;

    constructor(props) {
        super(props);

        this.socket = this.props.socket
        this.state = {
            client: {}
        };

        this.socket.once("data_initialization", data => {
            this.setState({
                client: data,
                showSnackbar: false,
                apps: this.state.apps
            });
        });

        this.socket.on('update', data => {
            this.newMessage(data.newMessage, data.client_id);
            this.oldMessages(data.oldMessages, data.client_id);            
        });

        this.socket.on('load_apps', data => {
            this.setState({
                client: this.state.client,
                showSnackbar: this.state.showSnackbar,
                snackbarMessage: this.state.snackbarMessage,
                apps: data
            });
        });

        this.socket.on('state_sent', data => {
            this.setState({
                client: this.state.client,
                showSnackbar: true,
                snackbarMessage: data.result ? 'success' : 'failure',
                apps: this.state.apps,
            });
        });

        this.socket.on('deleted', data => {
            if(data.success) {
                let client = {};
                for(let k in this.state.client) {
                    if(k != data.target) {
                        client[k] = this.state.client[k];
                    }
                }

                this.setState({
                    client: client,
                    showSnackbar: this.state.showSnackbar,
                    snackbarMessage: this.state.snackbarMessage,
                    apps: this.state.apps,
                })
            } else {
                let vars = data.target.split("_");
                alert(`Error deleting ${vars[0]}:${vars[1]}`);
            }
        });
    }

    newMessage(data, client_id) {
        let c = this.state.client;
        let found = false;

        for (let k in c) {
            if (k == client_id) {
                c[k].unshift(data);
                found = true;
                break;
            }
        }

        if (!found) {
            c[client_id] = [data];
        }
        
        this.setState({
            client: c,
            showSnackbar: this.state.showSnackbar,
            snackbarMessage: this.state.snackbarMessage,
            apps: this.state.apps,
        });

    }

    oldMessages(data, client_id) {
        let c = this.state.client;

        data.forEach(e => {
            for (let k in this.state.client) {
                if (k == client_id) {
                    this.state.client[k] = this.state.client[k].filter(m => m.time_sent != e.time_sent);
                    break;
                }
            }
        });

        this.setState({
            client: c,
            showSnackbar: this.state.showSnackbar,
            snackbarMessage: this.state.snackbarMessage,
            apps: this.state.apps,
        });
    }

    onAnimationEnd(target) {
        target.setState({
            client: this.state.client,
            showSnackbar: false,
            snackbarMessage: this.state.snackbarMessage,
            apps: this.state.apps,
        });
    }

    onChange(socket, dest_id, source_id, time_sent) {
        if(dest_id.toLowerCase() != 'none') {
            socket.emit('send_state_init', {
                dest_ip: dest_id,
                source_id: source_id,
                time_sent: time_sent
            });
        }
    }

    deleteAllMessages(socket, id) {
        socket.emit('delete', id);
    }

    render() {
        return (
            <div className='center'>
                <div className='single-client'>
                    <h1>cFS Network Switch</h1>
                    <img src="images/meatball.png" alt="I'm ballin'"></img>
                </div>
                <Table
                    clients={this.state.client}
                    onChange={(d, s, t) => this.onChange(this.socket, d, s, t)}
                    deleteFunc={id => this.deleteAllMessages(this.socket, id)}
                />
                <Snackbar isActive={this.state.showSnackbar} message={this.state.snackbarMessage} callback={() => this.onAnimationEnd(this)}></Snackbar>
            </div>
        );
    }
}

class AppRow extends React.Component {
    render() {
        return (
            <tr>
                <td>{this.props.name}</td>
                <td>{this.props.id}</td>
                <td>{this.props.file}</td>
            </tr>
        );
    }
}

class Table extends React.Component {
    render() {
        if (this.props.clients == null || this.props.clients == {} || Object.keys(this.props.clients).length == 0) {
            return (
                <div className="single-client warn">
                    <h2>No messages have been received</h2>
                </div>
            )
        }
        else {
            let all_options = Object.keys(this.props.clients)
            all_options = all_options.map(o => o.split("_")[0]);
            all_options = [...new Set(all_options)]
            return (
                Object.keys(this.props.clients).map(k => {
                    return <ClientIdentifier
                                id={k}
                                messages={this.props.clients[k]}
                                dropdown={all_options}
                                key={k}
                                onChange={(dest_id, time_sent) => this.props.onChange(dest_id, k, time_sent)}
                                deleteFunc={this.props.deleteFunc}
                            />
                })
            );
        }
    }
}

class ClientIdentifier extends React.Component {
    render() {
        let vals = this.props.id.split("_");
        return (
            <div className='single-client'>
                <h2>IP: {vals[0].replace(/․/g, ".")} - Port: {vals[1]}</h2>
                <div className="scroll">
                    <ClientTable messages={this.props.messages} dropdown={this.props.dropdown} onChange={this.props.onChange} />
                </div>
                <DeleteButton id={this.props.id} deleteFunc={this.props.deleteFunc}/>
            </div>
        );
    }
}

class DeleteButton extends React.Component {
    render() {
        return (
            <div className="align">
                <div className="center">
                    <button className="warn" onClick={() => this.props.deleteFunc(this.props.id)}>Delete</button>
                </div>
            </div>
        )
    }
}

class ClientTable extends React.Component {
    render() {
        return (
            <table>
                <thead>
                    <tr>
                        <th>App ID</th>
                        <th>Length</th>
                        <th>Time Sent</th>
                        <th>Send To</th>
                    </tr>
                </thead>
                
                <tbody>
                    {this.props.messages.map(message => {
                        return <ClientRow message={message} key={message.time_sent} dropdown={this.props.dropdown} onChange={this.props.onChange}/>;
                    })}
                </tbody>
            </table>
        );
    }
}

class ClientRow extends React.Component {
    render() {
        return (
            <tr>
                <td>{this.props.message.app_id}</td>
                <td>{this.props.message.contents.length}</td>
                <td>{convertTime(this.props.message.time_sent)}</td>
                <td>
                    <DropDownSender options={this.props.dropdown} onChange={dest_id => 
                        this.props.onChange(dest_id, this.props.message.time_sent)}/>
                </td>
            </tr>
        );
    }
}

class DropDownSender extends React.Component {
    render() {
        return (
            <select onChange={event => {
                this.props.onChange(event.target.value);
                event.target.selectedIndex = 0;
            }}>
                <option value="">None</option>
                {this.props.options.map(o =>
                    <option value={o} key={o}>{o}</option>
                )}
            </select>
        );
    }
}

function convertTime(t) {
    // Create a new JavaScript Date object based on the timestamp
    // multiplied by 1000 so that the argument is in milliseconds, not seconds.
    var date = new Date(t * 1000);
    // Hours part from the timestamp
    var hours = "0" + date.getHours();
    // Minutes part from the timestamp
    var minutes = "0" + date.getMinutes();
    // Seconds part from the timestamp
    var seconds = "0" + date.getSeconds();

    // Will display time in 10:30:23 format
    var formattedTime = hours.substr(-2) + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);

    return formattedTime;
}

class Snackbar extends React.Component {
    render() {
        return(
            <div onAnimationEnd={this.props.callback} className={["snackbar", this.props.isActive ? "show" : ""].join(" ")}>
                {this.props.message}
            </div>
        )
    }
}

export default EditingWindow;