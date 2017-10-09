'use strict'

const Frame = require('./frame.js')
const Transform = require('stream').Transform;
const StringDecoder = require('string_decoder').StringDecoder;
const Readable = require('readable-stream').Readable;

const stringDecoder = new StringDecoder('utf8');
const frameWidth = 76;

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


const Text = function() {
  this.lines = [];
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
}

Text.prototype.load = function( readStream, loadFinished ) {
  const that = this; // just to be sure

  if( !this.frames ) {
    this.frames = [];
  }

  if( this.frames.length > 0 ) {
    this.frames.length = 0;
  }

  readStream
    .pipe(that.lineSplitter)
    .on('data', function( data ) {
      that.lines.push(data);
    } )
    .on('error', function( err ) {
      console.log( err );
      loadFinished( err );
    })
    .on('end', function() {
      loadFinished()
    })
}

Text.prototype.save = function( writeStream, saveFinished ) {

  const that = this; // just to be sure
  const stream = new Readable({objectMode: true})
  stream._read = function() {};

  for( let i = 0; i<this.lines.length; i++ ) {
    stream.push(this.lines[i].toString()+"\n");
  }

  stream
    .pipe(writeStream)
    .on('error', function( err ) {
      console.log( err );
      saveFinished( err );
    })
    .on('end', function() {
      console.log( that.lines.length+" lines saved." );
      saveFinished()
    });
}

Text.prototype.lineCount = function() {
  return this.lines.length;
}

Text.prototype.grabFrame = function( options, grabFrameFinished ) {
  const pos = options.pos || 0;
  const height = options.height ||13;
  const duration = options.duration || 1;

  const frame = new Frame( duration );
  frame.generateEmpty(frameWidth,height);


  for( let y = 0; y<height; y++ ) {
    for( let x = 0; x<frameWidth; x++ ) {

      if( frame.lines[y-pos] && this.lines[y] ) {
        frame.lines[y-pos][x] = this.lines[y][x];
      }

    }

  }



  grabFrameFinished( null, frame );

}

Text.prototype.render = function() {
  let result ='';
  for( let i=0; i<this.lines.length; i++ ) {
    result += this.lines[i].toString('ascii')+"\n";
  }
  return result;
}

Text.fromText = function( text, done ) {


  //if( text[text.length-1] != '\n' )
  //  text+="\n";

  const stream = new Readable();//{objectMode: true})
  stream._read = function() {};

  for( let i = 0; i<text.length; i++ ) {
    stream.push(text[i]);
  }

  stream.push( null );

  let textFile = new Text();

  textFile.load( stream, function( err ) {
    if( err ) return done( err );
    done( null, textFile );
  } )

}

module.exports = Text;