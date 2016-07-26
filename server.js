var express = require('express');
var app = express();
var pg = require('pg');

var main_sql = "";
pg.defaults.ssl = true;
pg.connect(process.env.DATABASE_URL, function(err, client) {
  if (err) throw err;
  console.log('Connected to postgres! Getting schemas...');

  client
    .query('SELECT table_schema,table_name FROM information_schema.tables;')
    .on('row', function(row) {
      console.log(JSON.stringify(row));
    });
});

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

// Generic error handler used by all endpoints.
function handleError(res, reason, message, code) {
  console.log("ERROR: " + reason);
  res.status(code || 500).json({"error": message});
}

app.get('/', function(request, response) {
  response.render('pages/index');
});

app.get('/campaignmemberdetails', function (request, response) {
  //pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    //client.query('select * from uwwsharedcrm.campaign_member_activity__c', function(err, result) {
    pg.client.query(buildQuery(1), function(err, result) {
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

app.post('/campaignmemberdetails', function (request, response) {
	var newCampaignDetail = request.body;
	var validationErrors  = "";
	
	if  ((validationErrors=performValidations(newCampaignDetail)) != null) {
		response.send("Validation errors: "+validationErrors);
	}
	
	if (!campaignExists(newCampaignDetail)) {
		response.send("Non-existent campaign ID");
	}
	
	
	var sqlInsert = "insert into campaign_details (";
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
  });
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
		rtnSQL = "select sfid from uwwsharedcrm.campaign where sfid=\"";
	}
	console.log("returning SQL: "+rtnSQL);
	return rtnSQL;
	
}

function performValidations(body) {
	var rtnErrors;
	if (!(body.FirstName || body.LastName)) {
		rtnErrors+= "Invalid user input", "Must provide a first and last name.";
	}
	if (!(body.email) {
		rtnErrors+= "Invalid user input", "Must provide an email address.";
	}
	if (!(body.PostalCode) {
		rtnErrors+= "Invalid user input", "Must provide a postal code.";
	}
	return rtnErrors;
}

function campaignExists (body) {
    pg.client.query(buildQuery(2)+body.Campaign__c+"\"", function(err, result) {
      //done();
		if (err) {
      		console.error(err); 
      		return false;
      	} else { 
			return true;
		}
    });	
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


