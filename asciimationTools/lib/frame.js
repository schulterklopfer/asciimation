'use strict'

const Frame = function( duration=1, lines=null ) {
  this.duration = duration;
  this.lines = lines;
}

Frame.prototype.clone = function() {
  let newLines = [];

  for( let i=0; i<this.lines.length; i++ ) {

    let buf = Buffer.alloc(this.lines[i].length);

    this.lines[i].copy( buf, 0,0,this.lines[i].length );

    newLines.push( buf );
  }

  return new Frame( this.duration, newLines );
}

Frame.prototype.render = function() {
  let result = this.duration+"\n";
  for( let i=0; i<this.lines.length; i++ ) {
    result += this.lines[i].toString('ascii')+"\n";
  }
  return result;
}

Frame.prototype.width = function() {
  return this.lines[0].length;
}

Frame.prototype.height = function() {
  return this.lines.length;
}

Frame.prototype.duration = function() {
  return this.duration;
}

Frame.prototype.lines = function() {
  return this.lines;
}

Frame.prototype.toString = function() {
  return "Frame[duration="+this.duration+"]\n";
}

Frame.prototype.generateEmpty = function( width, height ) {
  this.lines = [];
  for( let y=0; y<height; y++ ) {
    let line = '';
    for( let x=0; x<width; x++ ) {
      line += ' ';
    }
    this.lines.push(Buffer.from(line, 'ascii') );
  }
}

Frame.prototype.writeInto = function( text, targetX, targetY ) {

  if( targetY < 0 || targetY >= this.height() ) return;

  const textBuffer = Buffer.from(text,'ascii');
  const maxX = Math.min( textBuffer.length + targetX, this.width() );
  const minX = Math.max( targetX, 0 );

  for( let x = minX; x<maxX; x++ ) {
    this.lines[targetY][x] = textBuffer[x-targetX];
  }

}

Frame.prototype.pasteInto = function( frame, targetX, targetY, targetWidth, targetHeight, sourceX, sourceY, filter = undefined ) {

  targetWidth = Math.min( frame.width(), targetWidth );
  targetHeight = Math.min( frame.height(), targetHeight );

  sourceX = Math.max( 0, sourceX );
  sourceY = Math.max( 0, sourceY );


  const maxX = Math.min( this.width(), targetWidth + targetX  );
  const maxY = Math.min( this.height(), targetHeight + targetY  );

  const minX = Math.max( targetX, 0 );
  const minY = Math.max( targetY, 0 );

  for( let y = minY; y<maxY; y++ ) {
    for( let x = minX; x<maxX; x++ ) {

      const oldChar = String.fromCharCode(this.lines[y][x]);
      let char = frame.lines[y-targetY+sourceY][x-targetX+sourceX];

      if( !(filter && oldChar === filter && char == 32) ) {
        this.lines[y][x] = char;
      }

    }

  }

}

module.exports = Frame;