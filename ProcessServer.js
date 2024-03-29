const
  { getMachineInfo } = require('./helpers/machine'),
  Process = require('./Process'),
  Emitter = require('events').EventEmitter,
  config = require('./config'),
  _ = require('lodash');

class ProcessServer {
  constructor({ io }) {
    this.processes = {}
    this.emitter = new Emitter();
    this.io = io;
    this.io.on('connection', this.handleConnection);
  }

  index = () => {
    return _.reduce(this.processes, (r, p, k) => { r[k] = p.json(); return r; }, {});
  }

  handleConnection = (socket) => {
    console.log('Connected: ', socket.id);
    socket.emit('a machine', getMachineInfo());
    socket.emit('a process index', this.index());
    socket.on('q process index', _ => socket.emit('a process index', this.index()));
    socket.on('start process', opts => this.startProcess(opts));
    socket.on('kill process', id => this.killProcess(id));
    socket.on('disconnect', _ => console.log('Disconnected :', socket.id));
    socket.on('vani', data => this.emitter.emit('vani message', data));
  }

  startProcess = (opts) => {
    const
      { command, elementId, docId, docPath, isCommon, appId  } = opts,
      p = new Process({ caller: { elementId, docId, isCommon, appId, docPath } });

    p.on('stdout', d => this.handleProcessDataEvent(p, 'stdout', d));
    p.on('stderr', d => this.handleProcessDataEvent(p, 'stderr', d));
    p.on('message', d => this.handleProcessDataEvent(p, 'message', d));
    
    p.on('error', err => {
      this.io.emit('event process', { process: p.json(), error: err.stack.toString(), event: 'error' })
    });

    p.on('close', d => {
      this.io.emit('event process', { process: p.json(), event: 'close' });
      setTimeout(_ => this.clearProcess(p.id), 10000);
    });

    p.run({
      command: command,
      env: { vaniPort: config.vaniPort },
      subPath: docPath
    });
    this.processes[p.id] = p;
    this.io.emit('event process', { process: p.json(), event: 'start' });
  }

  killProcess(id) {
    this.processes[id].stop();
  }

  handleProcessDataEvent(p, type, data) {
    this.io.emit('data process', { id: p.id, type: type, data: data});
    if (type === 'message')
      this.emitter.emit('process message', { id: p.id, data: data });
  }

  clearProcess(id) {
    if (!this.processes[id])
      return;

    this.processes[id].destroy();
    delete this.processes[id];
    this.io.emit('remove process', id);
  }

  dispatchMessageToAllProcesses(message) {
    // for (let id in this.processes) {
    //   this.processes[id].send(message);
    // }
  }

  dispatchMessageToVaniSocket(message) {
    this.io.emit('vani', message);
  }
}

module.exports = ProcessServer;