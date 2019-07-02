const { exec } = require('child_process');

const config = require('../config/config');

//this example expects config to point to SAClient appscan.bat script
const saClientTool = config.saClientTool;

//returns length of stderr
function irxGen(appDir, callback) {
    console.log('Running IRXgen in: ' + appDir);  
    exec(saClientTool + ' prepare ', {cwd: appDir}, (err, stdout, stderr) => {
        if (err) {
            console.log(JSON.stringify(err));
        }
        //console.log(`stdout: ${stdout}`);
        //console.log(`stderr: ${stderr}`);
        //console.log('length of stderr is:' + stderr.length);    
        if (stderr.length === 0) {
           console.log('IRX gen completed with no errors: ' + appDir)
        }
        callback(stderr.length);
    });  
}
