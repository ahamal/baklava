const
  express = require('express'),
  { fetchUsernames, deleteUsername, setPassword, checkPassword } = require('./helpers/password');

class AuthServer {
  constructor() {
    const router = this.router = express.Router();

    router.post('/login', (req, res) => {
      try {
        const { username, password } = req.body;
        if (!checkPassword({ username, password }))
          return res.status(401).send('Wrong username and password');
        req.session.authenticated = true;
        req.session.username = username;
        res.status(204).end();        
      } catch(e) {
        return res.status(401).send('Invalid arguments')        
      }
    });

    router.get('/whoami', (req, res) => {
      if (req.session.authenticated)
        res.status(200).send({username: req.session.username});
      else
        res.status(401).send('Unauthorized');
    });


    router.post('/logout', (req, res) => {
      req.session.authenticated = false;
      res.status(204).end();
    });

    router.get('/users', (req, res) => {
      if (!req.session.authenticated)
        res.status(401).send('Unauthorized');
      else
        res.send(fetchUsernames());
    });

    router.delete('/users/:username', (req, res) => {
      if (!req.session.authenticated || req.session.username === req.params.username)
        return res.status(401).send('Unauthorized');
      deleteUsername(req.params.username);
      res.status(204).end();
    });

    router.post('/users', (req, res) => {
      if (!req.session.authenticated) {
        res.status(401).send('Unauthorized');
        return;
      }
      try {
        const { username, password } = req.body;
        setPassword({ username, password });
        res.status(204).end();
      } catch (e) {
        // console.error(e);
        res.status(400).send('Bad Input');
      }
    });
  }
}

module.exports = AuthServer;