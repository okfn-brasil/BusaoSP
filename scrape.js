jQuery(function() {
  var url = 'http://search.twitter.com/search.json?q=%23BusaoSP&rpp=10';
  var dataset = null;
  var datahubUrl = 'http://datahub.io/api/data/bc739cd5-1bf3-45ac-b367-5b2321477032'
  var datahub = new recline.Backend.ElasticSearch({
    url: datahubUrl,
    headers: { 'Authorization': CONFIG['datahub.io'].authorization }
  });

  $.ajax({
    url: url,
    dataType: 'jsonp',
    success: showData
  });

  function showData(data) {
    var fields = [
      {id: 'created_at', type: 'dateTime'},
      {id: 'text'},
      {id: 'geo'},
      {
        id: 'link',
        is_derived: true,
        type: 'string',
        format: 'link'
      }
    ];
    var linkDeriver = function(value, field, doc) {
      return 'https://twitter.com/USER/status/ID'.replace('USER', doc.get('from_user')).replace('ID', doc.get('id'))
    };
    dataset = recline.Backend.createDataset(data.results, fields);
    dataset.fields.get('link').deriver = linkDeriver;
    var grid = new recline.View.Grid({
      model: dataset
    });
    $('body').append(grid.el);
    dataset.query().done(function() {
      dataset.currentDocuments.each(function(doc) {
        console.log(datahub);
        datahub.upsert(doc).done(function() {
          console.log('ok');
        });;
      });
    });
  }
});
