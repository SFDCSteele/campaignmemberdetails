var express = require('express');
var app = express();
var pg = require('pg');

var main_sql = "";
pg.defaults.ssl = true;

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

//SELECT * FROM test_table
//select * from campaign_member_activity__c
app.get('/campaignmemberdetails', function (request, response) {
  pg.connect(process.env.DATABASE_URL, function(err, client, done) {
    //client.query('select * from uwwsharedcrm.campaign_member_activity__c', function(err, result) {
    client.query(executeQuery(1), function(err, result) {
      done();
      if (err)
       { console.error(err); response.send("Error " + err); }
      else
       { response.render('pages/campaignmemberdetails', {results: result.rows} ); }
    });
  });
})

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

function executeQuery (opt) {
	var rtnSQL = "";
	if (opt == 1 ) {
		rtnSQL = "select "+
			"a.Id as ID,"+
			"a.sfid as /"SF ID/","+
			"a.Name as /"Activity Name/","+
			"a.Campaign__c as /"Campaign ID/","+
			"c.Name as /"Campaign Name/","+
			"a.Activity_Type__c as /"Activity Type/","+
			"a.Activity_Result__c as /"Activity Result/","+
			"a.RecordTypeId as /"Record Type ID/","+
			"a.Contact__c as /"Contact ID/","+
			"a.Lead__c as /"Lead ID/","+
			"a.Opportunity_Name__c as /"Opportunity Name/","+
			"a.Opportunity_Type__c as /"Opportunity Type/","+
			"a.Quiz_Name__c as /"Quiz Name/","+
			"a.Quiz_Type__c as /"Quiz Type/","+
			"a.Video_Name__c as /"Video Name/","+
			"a.Video_Type__c as /"Video Type/","+
			"a.Video_Status__c as /"Video Status/","+
			"a.Future_1__c as /"Future Result/""+
			"from uwwsharedcrm.campaign_member_activity__c a,uwwsharedcrm.campaign c"+
			"where a.Campaign__c=c.sfid";
	}
	return SQL;
	
}


