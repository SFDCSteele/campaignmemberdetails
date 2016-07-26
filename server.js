var express = require('express');
var pg = require('pg');
var path = require("path");
pg.defaults.ssl = true;
var bodyParser = require("body-parser");
//var xClient = new pg.Client();

var main_sql = "";
/*xClient.connect(process.env.DATABASE_URL, function(err, xClient) {
  if (err) throw err;
  console.log('Connected to postgres! Getting schemas...');

  client
    .query('SELECT table_schema,table_name FROM information_schema.tables;')
    .on('row', function(row) {
      console.log(JSON.stringify(row));
    });
});*/

var app = express();
app.use(express.static(__dirname + "/public"));
app.use( bodyParser.json() );       // to support JSON-encoded bodies
//app.use(express.json());       // to support JSON-encoded bodies

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.set('port', (process.env.PORT || 5000));

// Generic error handler used by all endpoints.
function handleError(res, reason, message, code) {
  console.log("ERROR: " + reason);
  res.status(code || 500).json({"error": message});
}

app.get('/', function(request, response) {
  response.render('pages/index');
});

app.get('/campaignmemberdetails', function (request, response) {
  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    //client.query('select * from uwwsharedcrm.campaign_member_activity__c', function(err, result) {
    client.query(buildQuery(1), function(err, result) {
      done();
      if (err)
       { console.error(err); response.send("Error " + err); }
      else
       { 
       	console.log ("1-rows: "+result.rows);
		console.log(JSON.stringify(result.rows));
       	displayObject(result.rows);
       	response.render('pages/campaignmemberdetails', {results: result.rows} 
       ); }
    });
  });
});

app.post('/campaignmemberdetails', function (request, response) {
	var bCampaignExists = "false";
	console.log("REQUEST     : "+request);
	console.log("REQUEST BODY: "+request.body);
    console.log(JSON.stringify(request.body));
	/*for (var prop in request.body) {
	    if (request.body.hasOwnProperty(prop)) {
	        console.log("1--"+prop +"-->"+request.body[prop]);
			console.log("object: "+JSON.stringify(request.body[prop]));
	    }
	}    
	console.log("REQUEST BODY: "+JSON.stringify(request.body));*/
	var newCampaignDetail = request.body;
	console.log("newCampaignDetail: "+JSON.stringify(newCampaignDetail));
	var validationErrors  = "";
	
	validationErrors=performValidations(newCampaignDetail);
	if  (validationErrors != null) {
		console.log("Validation errors: "+validationErrors);
		response.send("Validation errors: "+validationErrors);
	}
	
	bCampaignExists = campaignExists (newCampaignDetail);
	console.log("returning results of campaignExists: " + bCampaignExists);
	if (bCampaignExists=="true") {
		console.log("Campaign exists!: "+bCampaignExists);
	} else {
		console.log("xNon-existent campaign ID: "+bCampaignExists);
		response.send("yNon-existent campaign ID");
	}
	
	if ( newCampaignDetail.Activity_Type__c = "Video" ) {
		postVideoResults(newCampaignDetail);
	}
	
	response.send(200);
	/*var sqlInsert = "insert into campaign_details (";
	var sqlFields = "";
	var sqlValues = ") values (";
	var i = 0;
	
	for (var prop in newCampaignDetail) {
	    if (newCampaignDetail.hasOwnProperty(prop)) {
	    	if ( i++ > 0 ) {
	    		sqlFields += ",";
	    		sqlValues += ",";
	    	}
	    	sqlFields += prop;
	    	sqlValues += "'" + newCampaignDetail[prop] + "'";
	        console.log(prop +"-->"+newCampaignDetail[prop]);
	    }
	}    
    //pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    pg.client.query(sqlInsert+sqlFields+sqlValues+")", function(err, result) {
      done();
      if (err)
       { console.error(err); response.send("Error " + err+"<table><tr><td>datebase   url</td><td>"+process.env.DATABASE_URL+"</td></tr>"+
                                                          "<tr><td>sql statement:</td><td>"+sqlInsert+sqlFields+sqlValues+")"+"</td></tr></table>"); }
      else
       { 
	    response.send(200);
     	//response.render('pages/db', {results: result.rows} );
       }
    //});
  });*/
})

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

function buildQuery (opt) {
	var rtnSQL = "";
	if (opt == 1 ) {
		rtnSQL = "select "+
			"a.Id as ID,"+
			"a.sfid as \"SF ID\","+
			"a.Name as \"Activity Name\","+
			"a.Campaign__c as \"Campaign ID\","+
			"c.Name as \"Campaign Name\","+
			"a.Activity_Type__c as \"Activity Type\","+
			"a.Activity_Result__c as \"Activity Result\","+
			"a.RecordTypeId as \"Record Type ID\","+
			"a.Contact__c as \"Contact ID\","+
			"a.Lead__c as \"Lead ID\","+
			"a.Opportunity_Name__c as \"Opportunity Name\","+
			"a.Opportunity_Type__c as \"Opportunity Type\","+
			"a.Quiz_Name__c as \"Quiz Name\","+
			"a.Quiz_Type__c as \"Quiz Type\","+
			"a.Video_Name__c as \"Video Name\","+
			"a.Video_Type__c as \"Video Type\","+
			"a.Video_Status__c as \"Video Status\","+
			"a.Future_1__c as \"Future Result\" "+
			"from uwwsharedcrm.campaign_member_activity__c a, uwwsharedcrm.campaign c "+
			"where a.Campaign__c=c.sfid";
	} else if ( opt == 2 ) { //lookup campaign
		rtnSQL = "select sfid from uwwsharedcrm.campaign where sfid='";
	}
	console.log("returning SQL: "+rtnSQL);
	return rtnSQL;
	
}

function postVideoResults(body) {
	console.log("inside postVideoResults with activity: "+body.Name);
}

function performValidations(body) {
	var rtnErrors;
	if (!(body.FirstName || body.LastName)) {
		rtnErrors+= "Invalid user input\tMust provide a first and last name.";
	}
	if (!(body.email)) {
		rtnErrors+= "Invalid user input\tMust provide an email address.";
	}
	if (!(body.PostalCode)) {
		rtnErrors+= "Invalid user input\tMust provide a postal code.";
	}
	return rtnErrors;
}

function campaignExists (body) {
  var sSQL = buildQuery(2)+body.Campaign__c+"'";
  var rtnResults = "false";
  console.log("campaignExists: executing query: "+sSQL);
  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    client.query(sSQL, function(err, result) {
      done();
      if (err) { 
      	console.error(err); 
      } else { 
		rtnResults = "true";
       	console.log ("1-rows: "+JSON.stringify(result.rows)+" setting true");
	  }
    });
  });
  return rtnResults;
}

function displayObject(rows) {
	console.log("How many rows: "+Object.keys(rows).length);
	for (var row in rows) {
	    if (rows.hasOwnProperty(row)) {
	    	/*if ( i++ > 0 ) {
	    		sqlFields += ",";
	    		sqlValues += ",";
	    	}
	    	sqlFields += prop;
	    	sqlValues += "'" + newCampaignDetail[prop] + "'";*/
			console.log("How many columns: "+Object.keys(row).length);
	        console.log("2-"+row +"-->"+rows[row]);
	        for (var col in row) {
	        	if (row.hasOwnProperty(col)) {
	        		console.log("\t3-"+col+"-->"+row[col]);
	        	}
	        }
	    }
	}    
}


