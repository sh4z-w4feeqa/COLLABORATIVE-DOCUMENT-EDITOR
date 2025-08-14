const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;
app.use(cors());

mongoose.connect('mongodb://127.0.0.1:27017/collab-docs');

const docSchema = new mongoose.Schema({
  docId: String,
  content: String,
});
const Doc = mongoose.model('Doc', docSchema);

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinDoc', async (docId) => {
    socket.join(docId);
    let doc = await Doc.findOne({ docId });
    if (!doc) {
      doc = new Doc({ docId, content: '' });
      await doc.save();
    }
    socket.emit('loadDoc', doc.content);
  });

  socket.on('sendChanges', async ({ docId, content }) => {
    socket.to(docId).emit('receiveChanges', content);
    await Doc.findOneAndUpdate({ docId }, { content });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
