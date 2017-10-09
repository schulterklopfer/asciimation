'use strict'

const Frame = require('./frame.js');
const Transform = require('stream').Transform;
const StringDecoder = require('string_decoder').StringDecoder;
const Readable = require('readable-stream').Readable;

const stringDecoder = new StringDecoder('utf8');
const frameWidth = 76;
const frameHeight = 13;

const resizeLine = function( line, width ) {
  if( line.length < width ) {
    const count = width-line.length;
    for( let i=0; i<count; i++ ) {
      line += ' ';
    }
  } else {
    line = line.substr(0,width);
  }
  return line;
}


const Movie = function( frames = undefined ) {
  this.frames = frames;
  this.lineSplitter = new Transform({
    transform(chunk, encoding, cb) {
      if ( this._last === undefined ) { this._last = "" }
      this._last += stringDecoder.write(chunk);
      var list = this._last.split(/\n/);

      this._last = list.pop();
      for (var i = 0; i < list.length; i++) {
        let line = resizeLine(list[i], frameWidth);
        this.push( line );
      }
      cb();
    },

    flush(cb) {
      let line = resizeLine(this._last, frameWidth);
      line += stringDecoder.end();
      if (this._last) { this.push(line) }
      cb()
    }
  });

  this.frameCompiler = new Transform({
    readableObjectMode: true,
    transform(chunk, encoding, cb) {

      const line = chunk;

      if( !this._lines ) { this._lines = [] };

      this._lines.push( line );

      if( this._lines.length == frameHeight+1 ) {
        // frame complete
        const duration = parseInt(this._lines.shift());
        this.push( new Frame(duration,this._lines.slice()) );
        this._lines.length = 0;
      }
      cb();
    }
  });

  this.frameDecompiler = new Transform({
    writableObjectMode: true,
    transform(frame, encoding, cb) {
      if( frame ) {
        this.push( frame.render() );
      }
      cb();
    },
    flush(cb) {
      this.push( frame.render() );
      cb();
    }
  });
}

Movie.prototype.load = function( readStream, loadFinished ) {
  const thisMovie = this; // just to be sure

  if( !this.frames ) {
    this.frames = [];
  }

  if( this.frames.length > 0 ) {
    this.frames.length = 0;
  }

  readStream
    .pipe(thisMovie.lineSplitter)
    .pipe(thisMovie.frameCompiler)
    .on('data', function( data ) {
      thisMovie.frames.push(data);
    } )
    .on('error', function( err ) {
      console.log( err );
      loadFinished( err );
    })
    .on('end', function() {
      loadFinished()
    })
}

Movie.prototype.save = function( writeStream, saveFinished ) {

  const thisMovie = this; // just to be sure
  const stream = new Readable({objectMode: true})
  stream._read = function() {};

  for( let i = 0; i<this.frames.length; i++ ) {
    stream.push(this.frames[i] );
  }

  stream
    .pipe(thisMovie.frameDecompiler)
    .pipe(writeStream)
    .on('error', function( err ) {
      console.log( err );
      saveFinished( err );
    })
    .on('end', function() {
      console.log( thisMovie.frames.length+" frames saved." );
      saveFinished()
    });
}

Movie.prototype.frameWidth = function() { return frameWidth; }
Movie.prototype.frameHeight = function() { return frameHeight; }


module.exports = Movie;