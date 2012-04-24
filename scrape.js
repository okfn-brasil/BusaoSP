jQuery(function() {
  var url = 'http://search.twitter.com/search.json?q=%23BusaoSP&rpp=10';
  var dataset = null;
  var datahubUrl = 'http://datahub.io/api/data/bc739cd5-1bf3-45ac-b367-5b2321477032'
  var datahub = null;
  if (typeof CONFIG !== 'undefined' && CONFIG['datahub.io']) {
    var datahub = new recline.Backend.ElasticSearch({
      url: datahubUrl,
      headers: { 'Authorization': CONFIG['datahub.io'].authorization }
    });
  } else {
    alert('Uploading to datahub disabled as no API key');
  }

  $.ajax({
    url: url,
    dataType: 'jsonp',
    success: showData
  });

  function showData(data) {
    var dataset = makeDataset(data);
    var grid = new recline.View.Grid({
      model: dataset
    });
    $('body').append(grid.el);

    dataset.query().done(function() {
      dataset.currentDocuments.each(function(doc) {
        geocode(doc, function() {
          if (datahub) {
            datahub.upsert(doc).done(function() {
              console.log('Uploaded to DataHub OK: ' + doc.id);
              console.log(doc.toJSON());
            });
          }
        });
      });
    });
  }

  function geocode(doc, callback) {
    var loc = doc.get('text').match(/na (.*) as/);
    if (loc) {
      loc = loc[1];
      var geocoder = new google.maps.Geocoder();
      geocoder.geocode(
        {
          'address': loc,
          'region': 'zkp'
        }, function(data, status) {
          if (data) {
            var latlng = data[0].geometry.location;
            doc.set({lat: latlng.lat(), lon: latlng.lng()});
          }
          callback(doc);
        }
      );
    } else {
      callback(doc)
    }
  }

  function makeDataset(twitterData) {
    var fields = [
      {id: 'created_at', type: 'dateTime'},
      {id: 'text'},
      {id: 'geo'},
      {id: 'lon'},
      {id: 'lat'},
      {
        id: 'link',
        is_derived: true,
        type: 'string',
        format: 'link'
      }
    ];
    dataset = recline.Backend.createDataset(twitterData.results, fields);

    // add derived link field
    var linkDeriver = function(value, field, doc) {
      return 'https://twitter.com/USER/status/ID'.replace('USER', doc.get('from_user')).replace('ID', doc.get('id'))
    };
    dataset.fields.get('link').deriver = linkDeriver;

    return dataset;
  }
});
