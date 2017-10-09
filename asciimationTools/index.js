'use strict'

const fs = require( 'fs' );
const Movie = require('./lib/movie.js');
const Frame = require('./lib/frame.js');
const Text = require('./lib/text.js');
const async = require('async');
const figlet = require('figlet');


const frameWidth = 76;
const frameHeight = 13; // including duration


const figletConf = {
  skillCategory: {
    //font: 'small',
    kerning: 10,
    horizontalLayout: 'center',
    verticalLayout: 'center'
  }
}

let frames = [];

async.waterfall( [
  createIntro,
  createSkills
], function(err) {
// all done!
  console.log( "all done" );
  const movie = new Movie(frames);
  const wStream = fs.createWriteStream("cv.txt");

  movie.save( wStream, function( err ) {
    console.log( "saved movie" );
    wStream.close();
  })
});

function createIntro( createIntroDone ) {
  const textFile = new Text();
  const logoReadStream = fs.createReadStream("./data/logo.txt");

  textFile.load( logoReadStream, function( err ) {

    if( err ) return createIntroDone(err);

    textFile.grabFrame( {pos: 0, duration:99 }, function( err, logoFrame ) {
      if( err ) return createIntroDone();

      if( logoFrame ) {
        console.log( logoFrame.render() );

        const introReadStream = fs.createReadStream("./data/intro.txt");

        introReadStream.on('open', function(err) {
          const introMovie = new Movie();
          introMovie.load(introReadStream, function(err) {
            console.log( "intro loaded");

            const introFrames = introMovie.frames;

            for( let i=0; i<introFrames.length; i++ ) {
              introFrames[i].pasteInto( logoFrame, 19,0, 29,13,0,0, '.' );
              frames.push( introFrames[i] );
            }

            createIntroDone();

          });
        });
      }else {
        createIntroDone( new Error('No logo frame') );
      }
    });
  });
}

function createSkills( createSkillsDone ) {

  const data = require('./data/data.json');
  const skills = data.skills;

  async.eachSeries( skills, function( category, nextCategory ) {
    console.log( "Rendering "+category.name+" with "+category.skills.length+" skills." );

    let skillY = frameHeight - Math.max( 0, Math.floor(( frameHeight - category.skills.length )*0.5 )) -1 ;
    let categoryTitleX = 8;
    let skillNameX = 13;
    let skillScoreX = 45;

    console.log( skillY );

    async.waterfall( [
      function( nextCategoryStep ) {
        // create a line seperated header using figlet
        let title = figlet.textSync(category.name, figletConf['skillCategory'] );
        Text.fromText( title, nextCategoryStep );
      },
      function( text, nextCategoryStep ) {
        // generate a frame to work with
        text.grabFrame( {pos: 0, duration:1 }, nextCategoryStep);
      },
      function( frame, nextCategoryStep ) {

        // show category headers and animate them:

        for( let y=-9; y<=3; y++) {

          let duration = 1;

          if( y==3 ) {
            duration = 6;
          }

          let newFrame = new Frame(duration)

          newFrame.generateEmpty(frameWidth,frameHeight);

          newFrame.pasteInto(frame, categoryTitleX,y,60,6,0,0);

          frames.push(newFrame);
        }


        for( let i=0; i<=6; i++) {
          let newFrame = new Frame(3)
          newFrame.generateEmpty(frameWidth,frameHeight);

          if( i%2==0 ) {
            newFrame.pasteInto(frame, categoryTitleX,3,60,6,0,0);
          }


          frames.push(newFrame);
        }


        nextCategoryStep();
      },
      function( nextCategoryStep ) {
        console.log( "    skills:" );
        let oldFrame;

        async.eachOfSeries( category.skills, function( skill, i, nextSkill ) {

          let scoreString = '';

          for( let j=0; j<skill.score; j++ ) {
            scoreString+='*';
          }


          async.waterfall( [
              function(nextSkillStep) {
                Text.fromText(skill.name, nextSkillStep );
              },
              function(text,nextSkillStep) {
                text.grabFrame( {pos: 0, duration:1 }, nextSkillStep);
              },
              function(frame,nextSkillStep) {
                let newFrame = new Frame(5)

                newFrame.generateEmpty(frameWidth,frameHeight);

                if( oldFrame ) {
                  newFrame.pasteInto(oldFrame, 0,-1,frameWidth,frameHeight,0,0);
                }

                newFrame.pasteInto(frame,skillNameX,skillY,frameWidth,1,0,0);

                frames.push( newFrame );
                oldFrame = newFrame.clone();

                console.log( "       * "+skill.name );

                nextSkillStep(null,newFrame);
              },

              function(frame,nextSkillStep) {

                let star = Buffer.from('*','ascii')[0];
                let empty = Buffer.from(' ','ascii')[0];

                for( let i=0; i<skill.score; i++ ) {
                  let newFrame = frame.clone();
                  newFrame.duration=1;

                  for( let j=0; j<=i; j++ ) {
                    newFrame.lines[skillY][skillScoreX+j] = star;
                  }

                  frames.push(newFrame);
                  oldFrame = newFrame.clone();
                }

                for( let i=0; i<6; i++ ) {
                  let newFrame = frame.clone();
                  newFrame.duration=3;

                  for( let j=0; j<skill.score; j++ ) {
                    newFrame.lines[skillY][skillScoreX+j] = (i+j)%2==0?empty:star;
                  }

                  frames.push(newFrame);
                  oldFrame = newFrame.clone();
                }

                let newFrame = frame.clone();
                newFrame.duration=6;

                for( let j=0; j<skill.score; j++ ) {
                  newFrame.lines[skillY][skillScoreX+j] = star;
                }

                frames.push(newFrame);
                oldFrame = newFrame.clone();


                nextSkillStep();

              }

            ], nextSkill
          );
        }, nextCategoryStep );
      }
    ], nextCategory )

  }, createSkillsDone );
}

function createScroller( createScrollerDone ) {
  const textFile = new Text();
  const readStream = fs.createReadStream("./data/cv_en_2017_reduced.txt");

  //readStream.on('open', function () {
    textFile.load( readStream, function( err ) {

      let count = Math.ceil(textFile.lineCount()/frameHeight)*frameHeight;

      let frames = [];


      async.timesSeries(count,function(i,next) {
        textFile.grabFrame( {pos:i*frameHeight, duration:99 }, function( err, frame ) {

          if( frame ) {

            let targetFrame;
            let duration;

            // create empty pause frame
            /*
            targetFrame = new Frame(5);
            targetFrame.generateEmpty(frameWidth,frameHeight);
            frames.push( targetFrame );
            */


            // roll in from below
            for( let i=frameHeight; i>=0; i-- ) {
              duration = Math.round(Math.sin(i*Math.PI/frameHeight)*3);
              if( duration == 0 ) duration = 1;

              if( i==0 ) {
                duration = 20;
              }

              targetFrame = new Frame(duration);
              targetFrame.generateEmpty(frameWidth,frameHeight);
              targetFrame.pasteInto( frame, 0, i,frameWidth,frameHeight,0,0);
              frames.push( targetFrame );
            }

            // move off to side

            for( let i=0; i<=frameWidth; i++ ) {
              duration = 1;

              targetFrame = new Frame(duration);
              targetFrame.generateEmpty(frameWidth,frameHeight);

              // to right
              targetFrame.pasteInto( frame, i, 0, frameWidth, 3, 0, 0);

              // to left
              targetFrame.pasteInto( frame, -i, 3, frameWidth, 3, 0, 3);

              // to right
              targetFrame.pasteInto( frame, i, 6, frameWidth, 3, 0, 6);

              // to left
              targetFrame.pasteInto( frame, -i, 9, frameWidth, 4, 0, 9);

              frames.push( targetFrame );
            }


          }
          next();

        } );
      },function(err) {
        const movie = new Movie( frames );

        const writeStream = fs.createWriteStream("__scroller.txt");

        movie.save( writeStream, function( err ) {
          console.log( "saved scroller" );
        })

      });
    });
  //});
}
