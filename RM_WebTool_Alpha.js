// HELPER FUNCTIONS ------------------------------------------------------------------------------------

const numToBinaryString = function(num, places){
    let power = 0;
    while( num >= 2**(power+1) ){
        power += 1;
    }

    let binaryString = '';
    while( power >= 0 ){
        if ( num-2**power >=0 ) {
            binaryString += "1";
            num -= 2**power;
        }
        else{
            binaryString += "0"
        }
        power -= 1;
    }

    //All functions using binary string to represent sets expect all strings to be the same length (number of players)
    let zeros = '';
    if(binaryString.length < places){
        for(let i=1; i <= (places-binaryString.length); i++ ){
            zeros = zeros + '0';
        }
    }
    
    return zeros + binaryString;
}

const binaryStringToNum = function(binString){
    let power = 0;
    let num = 0;

    while(binString.length > 0){
        if(binString[binString.length -1] == '1'){
            num += 2**power;
        }
        binString = binString.slice(0, -1);
        power++;
    }
    return num;
}

String.prototype.replaceAt = function(index, replacement) {
    return this.substring(0, index) + replacement + this.substring(index + replacement.length);
}

const sFact = function(num)
{
    var rval=1;
    for (var i = 2; i <= num; i++)
        rval = rval * i;
    return rval;
}



// SET AND STRING FUNCTIONS -------------------------------------------------------------------------------------


//Assuming input is correctly formatted binary representation of set
const getDirSubsets = function(setString){
    let subsets = [];

    for(let i=0; i < setString.length; i++){
        if(setString[i] == "1"){
            subsets.push(setString.replaceAt(i,"0") );
        }
    }
    return subsets;
}

//Assuming input is correctly formatted binary representation of set
const getDirSupersets = function(setString){
    let supersets = [];

    for(let i=0; i < setString.length; i++){
        if(setString[i] == "0"){
            supersets.push(setString.replaceAt(i,"1") );
        }
    }
    return supersets;
}

//Function to generate all supersets of a given set-string which is assumed to be formatted correctly. Used for extrapolating winning supersets from a given set through assumed monotonicity of SVG's.
const monoGetAllSuperSets = function(setString){
    let superSets = [];

    let numPlayersNotInString = 0;
    for(let i=0; i<setString.length; i++){
        if( setString[i] == '0' ){
            numPlayersNotInString += 1;
        }
    }

    for(let i=1; i<2**numPlayersNotInString; i++){
        let spliceInString = numToBinaryString(i, numPlayersNotInString);
        let newString = setString;
        let k=0;


        for(let j=0; j<setString.length; j++){
            if(newString[j] == '0'){
                if(spliceInString[k] == '1' ){
                    newString = newString.replaceAt(j, '1');
                }
                k+=1;
            }

        }

        superSets.push(newString);
    }
    return superSets;
}


//Assuming that curDiv is correctly formatted binary string representation of set
const getLoyalWinChildren = function(winningDivs, curDiv){
    let allChildren = getDirSubsets(curDiv);
    let loyalChildren = [];

    for(let i=0; i< allChildren.length; i++){
        if( winningDivs.includes(allChildren[i]) ){
            loyalChildren.push(allChildren[i]);
        }
    }
    return loyalChildren;
}

const getLoyalLossChildren = function(winningDivs, curDiv){
    let allChildren = getDirSupersets(curDiv);
    let loyalChildren = [];

    for(let i=0; i< allChildren.length; i++ ){
        if( ! winningDivs.includes(allChildren[i]) ){
            loyalChildren.push(allChildren[i]);
        }
    }
    return loyalChildren;
}


// CALCULATING THE RM INDEX -------------------------------------------------------------------------------------


const posEffScore = function(inpPlayer, inpWinningDivs){
    
    //Extracting how many players there are in voting game implicitly
    let numPlayers = inpWinningDivs[0].length;

    //Create a store for memoization of previously computed results
    let store = [];
    for(let i= 1; i<= 2**numPlayers; i++ ){
        store.push(null); 
    }

    //Recursive helper function to compute efficacy score of each division. Checks store before anything else
    function recPosEffScore(player, curDiv, winningDivs){

        //Checking if score is already computed for current division. Useful in recursive steps.
        if( store[binaryStringToNum(curDiv)] != null ){
            return store[binaryStringToNum(curDiv)];
        }

        //0-score base cases
        if( curDiv.charAt(player-1)== '0' ){
            store[binaryStringToNum(curDiv)] = 0;
            return 0;
        }
        if( ! winningDivs.includes(curDiv) ){
            store[binaryStringToNum(curDiv)] = 0;
            return 0;
        }
        
        //1-score base case. curDiv is known to be winning at this point and player has voted yes in curDiv
        let dirSubSets = getDirSubsets(curDiv);
        for(let i=0; i < dirSubSets.length; i++){
            //Need to check both that subset is losing AND that player was decisive if that is the case
            if( (! winningDivs.includes(dirSubSets[i])) && (dirSubSets[i].charAt(player-1)== '0') ){
                store[binaryStringToNum(curDiv)] = 1;
                return 1;
            }
        }

        //Recursive step
        let loyalChildren = getLoyalWinChildren(winningDivs, curDiv);

        let returnValue = 0;
        for(let i=0; i<loyalChildren.length; i++ ){
            returnValue += recPosEffScore(player, loyalChildren[i], winningDivs);   
        }
        returnValue = returnValue/(loyalChildren.length);

        store[binaryStringToNum(curDiv)] = returnValue;
        return returnValue;
    }
    
    //Computing effscore for all divisions and then returning the whole store
    for(let i=0; i<2**numPlayers; i++ ){
        recPosEffScore(inpPlayer, numToBinaryString(i, numPlayers), inpWinningDivs);
    }

    return store;
}



const negEffScore = function(inpPlayer, inpWinningDivs){

    //Extracting how many players there are in voting game implicitly
    let numPlayers = inpWinningDivs[0].length;

    //Create a store for memoization of previously computed results
    let store = [];
    for(let i= 1; i<= 2**numPlayers; i++ ){
        store.push(null); 
    }

    //Recursive helper function to compute efficacy score of each division. Checks store before anything else
    function recNegEffScore(player, curDiv, winningDivs){

        //Checking if score is already computed for current division. Useful in recursive steps.
        if( store[binaryStringToNum(curDiv)] != null ){
            return store[binaryStringToNum(curDiv)];
        }

        //0-score base cases
        if( curDiv.charAt(player-1)== '1' ){
            store[binaryStringToNum(curDiv)] = 0;
            return 0;
        }
        if( winningDivs.includes(curDiv) ){
            store[binaryStringToNum(curDiv)] = 0;
            return 0;
        }

        //1-score base case, curDiv is known to be losing at this point and that player is voting no in curDiv
        let dirSuperSets = getDirSupersets(curDiv);
        for(let i=0; i< dirSuperSets.length; i++){
            if( ( winningDivs.includes(dirSuperSets[i]) ) && ( dirSuperSets[i].charAt(player-1)== '1' ) ){
                store[binaryStringToNum(curDiv)] = 1;
                return 1;
            }
        }

        //Recursive step
        let loyalChildren = getLoyalLossChildren(winningDivs, curDiv);

        let returnValue = 0;
        for(let i=0; i<loyalChildren.length; i++ ){
            returnValue += recNegEffScore(player, loyalChildren[i], winningDivs);   
        }
        returnValue = returnValue/(loyalChildren.length);

        store[binaryStringToNum(curDiv)] = returnValue;
        return returnValue;

    }

    //Computing effscore for all divisions and then returning the whole store
    for(let i=0; i<2**numPlayers; i++ ){
        recNegEffScore(inpPlayer, numToBinaryString(i, numPlayers), inpWinningDivs);
    }

    return store;
}

//Combines the positive and negative efficacy scores into the same array. Used in calculating the total recursive measure.
const totEffScore = function(player, winningDivs){
    let posScores = posEffScore(player, winningDivs);
    let negScore = negEffScore(player, winningDivs);

    for(let i=0; i< posScores.length; i++){
        posScores[i] += negScore[i];
    }
    return posScores;
}


//Calculates the recursive measure for a given player given the assumption that all divisions are equiprobable
const eqProbRM = function(player, winningDivs){
    let numPlayers = winningDivs[0].length;

    let totScores = totEffScore(player, winningDivs);
    let returnValue = 0;

    for(let i=0; i < totScores.length; i++){
        returnValue += totScores[i];
    }

    return (returnValue/(2**numPlayers))
}



const allPlayersEqProbRM = function(winningDivs){
    let numPlayers = winningDivs[0].length;

    let measures = [];
    for(let i=0; i < numPlayers; i++){
        measures[i] = eqProbRM((i+1), winningDivs);
    }

    return measures;
}


// CALCULATING THE SS INDEX ---------------------------------------------------------------------------------------


// Function to calculate the SS index for a given player 
const SSIndex = function(player, winningDivs, numPlayers){
    let returnValue = 0;

    for(i=0; i<winningDivs.length; i++){
        //Player cannot be decisive if not in division, so go to next division
        if(winningDivs[i].charAt(player-1) == 0){
            continue;
        }
    
        //Checking if the given player is decisive or not by examining the current division with player excluded
        let divWithoutPlayer = winningDivs[i].replaceAt((player-1),'0');
        if( ! winningDivs.includes(divWithoutPlayer) ){

            let numPlayersInDiv = 0;
            for( let j=0; j<numPlayers; j++ ){
                if(winningDivs[i].charAt(j) == '1'){
                    numPlayersInDiv += 1;
                }
            }

            returnValue += sFact( numPlayersInDiv - 1 ) * sFact( numPlayers - numPlayersInDiv );
        }
    }

    return (returnValue/(sFact(numPlayers)));
}

const SSIndexAllPlayers = function(winningDivs){
    let numPlayers = winningDivs[0].length;

    let measures = [];
    for(let i=0; i<numPlayers;i++){
        measures[i] = SSIndex((i+1), winningDivs, numPlayers);
    }

    return measures;
}


// CALCULATING THE PB MEASURE -----------------------------------------------------------------------------------------

//Function to calculate the PB measure for a given player
const PBMeasure = function(player, winningDivs, numPlayers){
    let returnValue = 0;

    for(i=0; i<winningDivs.length; i++){
        //Player cannot be decisive if not in division, so go to next division
        if(winningDivs[i].charAt(player-1) == 0){
            continue;
        }
        
        //At this point, it is known that the player is in the current winning division, so check if it is critical
        let divWithoutPlayer = winningDivs[i].replaceAt((player-1),'0');
        if( ! winningDivs.includes(divWithoutPlayer) ){
            returnValue += 1;
        }
    }

    return ( returnValue / 2**(numPlayers-1));
}


const PBMeasureAllPlayers = function(winningDivs){
    let numPlayers = winningDivs[0].length;

    let measures = [];
    for(let i=0; i<numPlayers;i++){
        measures[i] = PBMeasure((i+1), winningDivs, numPlayers);
    }

    return measures;
}





// TRANSLATING SIMPLE VOTING GAMES -------------------------------------------------------------------------------------------------------
const getWinningSetsSVG= function(quota, playerWeights){
    let winningDivs = [];
    let numPlayers = playerWeights.length;

    for(let i=0; i<2**numPlayers; i++){
        let curString = numToBinaryString(i, numPlayers);
        let curTotWeight = 0;

        //Calculating the total weights of all yes votes        
        for(let j=0; j<numPlayers;j++){
            if(curString[j] == '1'){
                curTotWeight += playerWeights[j];
            }
        }

        if(curTotWeight >= quota){
            winningDivs.push(curString);
        }
    }
    return winningDivs;
}




//USER INTERFACE -----------------------------------------------------------------------------------------------

// Function taking strings of the string input format where every line indicates a winning set including only the players (by number such as 3) which are in the winning division for that line
// NOTE: under current implementation, this only works for up to 9 players
// NOTE: under current implementation, it appears to only work when inpDiv is in string format
const fromInpDivToBinString = function(numPlayers, inpDiv){
    let outPutString = "";
    for(let i=0; i<numPlayers; i++){
        outPutString += '0'
    }

    for(let i=0; i < inpDiv.length; i++){
        outPutString = outPutString.replaceAt( (inpDiv.charAt(i) -1), "1");
    }

    return outPutString;
}

// Function to take raw input string from web page and convert it into array of binary strings of winning divisions
const getInpStringToWinningDivs = function(inpString, numPlayers){
    let inpWinningDivs = (inpString).split(/\r?\n/);

    let filtInpWinningDivs = inpWinningDivs.filter(function (el){
        if(el != '' && el != null){
            return el;
        }
    });
    
    let winningDivs = [];

    for(let i=0;i< filtInpWinningDivs.length; i++){
        winningDivs.push( fromInpDivToBinString(numPlayers, filtInpWinningDivs[i]) );
    }

    return winningDivs;
}

// Function to create HTML table to display on
const createTableGSVG = function(RMMeasures, SSMeasures, PBMeasures){
    let num_cols = document.getElementById("GSVGnumPlayers").value ;
    let tHeader = '<table border="1">\n'
    let tBody = '';

    tBody += '<tr>';

    tBody += '<td>';
    tBody += "Measure \\ Player"
    tBody += '</td>';

    for(var i =0; i< num_cols; i++ ){
        tBody += '<td>';
        tBody += "Player " + (i+1)
        tBody += '</td>';
    }
    tBody += '</tr>\n';

    
    tBody += '<tr>'
    tBody += '<td>';
    tBody += "Recursive Measure"
    tBody += '</td>';
    for(var i =0; i< num_cols; i++ ){
        tBody += '<td>';
        tBody += RMMeasures[i].toFixed(3);
        tBody += '</td>';
    }
    tBody += '</tr>\n';

    tBody += '<tr>'
    tBody += '<td>';
    tBody += "SS Index"
    tBody += '</td>';
    for(var i =0; i< num_cols; i++ ){
        tBody += '<td>';
        tBody += SSMeasures[i].toFixed(3);
        tBody += '</td>';
    }
    tBody += '</tr>\n';

    tBody += '<tr>'
    tBody += '<td>';
    tBody += "PB Measure"
    tBody += '</td>';
    for(var i =0; i< num_cols; i++ ){
        tBody += '<td>';
        tBody += PBMeasures[i].toFixed(3);
        tBody += '</td>';
    }
    tBody += '</tr>\n';




    let tFooter = '</table>'

    document.getElementById('GSVGTable').innerHTML = tHeader + tBody + tFooter;
}


const GSVGgetInputAndExecute = function(){
    let numPlayers = document.getElementById("GSVGnumPlayers").value;
    let inpWinningDivs = (document.getElementById("GSVGwinningDivs").value);
   
    let winningDivs = getInpStringToWinningDivs(inpWinningDivs, numPlayers);

    createTableGSVG(allPlayersEqProbRM(winningDivs), SSIndexAllPlayers(winningDivs), PBMeasureAllPlayers(winningDivs));
    console.log(allPlayersEqProbRM(winningDivs));
    console.log(SSIndexAllPlayers(winningDivs));
    console.log(PBMeasureAllPlayers(winningDivs));
}






// Function to create HTML table to display on
const createTableWSVG = function(RMMeasures, SSMeasures, PBMeasures, numPlayers){
    let num_cols = numPlayers ;
    let tHeader = '<table border="1">\n'
    let tBody = '';

    tBody += '<tr>';

    tBody += '<td>';
    tBody += "Measure \\ Player"
    tBody += '</td>';

    for(var i =0; i< num_cols; i++ ){
        tBody += '<td>';
        tBody += "Player " + (i+1)
        tBody += '</td>';
    }
    tBody += '</tr>\n';

    
    tBody += '<tr>'
    tBody += '<td>';
    tBody += "Recursive Measure"
    tBody += '</td>';
    for(var i =0; i< num_cols; i++ ){
        tBody += '<td>';
        tBody += RMMeasures[i].toFixed(3);
        tBody += '</td>';
    }
    tBody += '</tr>\n';

    tBody += '<tr>'
    tBody += '<td>';
    tBody += "SS Index"
    tBody += '</td>';
    for(var i =0; i< num_cols; i++ ){
        tBody += '<td>';
        tBody += SSMeasures[i].toFixed(3);
        tBody += '</td>';
    }
    tBody += '</tr>\n';

    tBody += '<tr>'
    tBody += '<td>';
    tBody += "PB Measure"
    tBody += '</td>';
    for(var i =0; i< num_cols; i++ ){
        tBody += '<td>';
        tBody += PBMeasures[i].toFixed(3);
        tBody += '</td>';
    }
    tBody += '</tr>\n';




    let tFooter = '</table>'

    document.getElementById('WSVGTable').innerHTML = tHeader + tBody + tFooter;
}




const WSVGgetInputAndExecute = function(){
    let inpWeightsRaw =  document.getElementById("WSVGWeights").value.split(' ');
    let inpWeights = [];
    for(let i=0; i<inpWeightsRaw.length;i++){
        if(inpWeightsRaw[i] == ''){ continue; }
        inpWeights.push(Number(inpWeightsRaw[i]));
    }

    let quota = document.getElementById("WSVGQuota").value;

    let numPlayers = inpWeights.length;
    let winningDivs = getWinningSetsSVG(quota, inpWeights);

    createTableWSVG(allPlayersEqProbRM(winningDivs), SSIndexAllPlayers(winningDivs), PBMeasureAllPlayers(winningDivs), numPlayers);
}


