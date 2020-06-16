/* vim: set tabstop=2 softtabstop=2 shiftwidth=2 expandtab smarttab autoindent: */

/** 
 * Magic Mirror
 * Module: MMM-InfluxChart
 *
 * MIT Licensed
 */

Module.register('MMM-InfluxChart',
{
  /**
   * Set the default values
   */
  defaults:
  {
    width: 200,
    height: 200,
    ariaLabel: 'Data Chart',
    xLabel: 'date',
    xLabelVisible: true,
    yLabel: '',
    yLabelVisible: true,
    chartType: 'line',
    url: 'http://localhost:8086/',
    database: 'magicmirror',
    query: '',
    dateTimeFormat: 'HH:mm',
    interval: 'hour',
    backgroundColor: 'rgba(255, 0, 200, 0.3)',
    borderColor: 'rgba(255, 0, 255, 0.6)',
    borderWidth: 1,
    labelFontColor: '#999',
    labelFontSize: 15,
    labelFontFamily: '"Roboto Condensed", Arial, Helvetica, sans-serif',
    labelLineHeight: '15px'
  },

  currentValue: null,

  /**
   * Get the scripts for the module
  */
  getScripts: function()
  {
    return [
      this.file('node_modules/chart.js/dist/Chart.bundle.min.js'),
      this.file('node_modules/jquery/dist/jquery.min.js'),
      this.file('luxon.min.js')
    ];
  },

  /**
   * Start the module
   */
	start: function()
  {
    this.config = Object.assign({}, this.defaults, this.config);
		Log.info('Starting module: ' + this.name);
	},

  /**
   * Read the data points and labels from the InfluxDB
   */
  getData: function()
  {
    // Define the DateTime from luxon
    var DateTime = luxon.DateTime;
    var current = DateTime.local().endOf(this.config.interval).plus({minutes: 1}).toFormat(this.config.dateTimeFormat);

    // Build the URL for InfluxDB query
    var url = this.config.url + 'query?db=' + encodeURIComponent(this.config.database) + '&q=' + encodeURIComponent(this.config.query);
    
    // Execute the query and go through the result points for first serie
    var labels = [];
    var points = [];
    var currentValue = null;
    console.log(current);
    var dateTimeFormat = this.config.dateTimeFormat;
    $.ajax({url: url, async: false}).done(function(data)
    {
      let serie = data.results[0].series[0];
      for (const value of serie.values)
      {
        let datetime = DateTime.fromISO(value[0]).toFormat(dateTimeFormat);
        if (current == datetime)
        {
          currentValue = parseFloat(value[1]);
        }
        labels.push(datetime);
        points.push(parseFloat(value[1]));
      }
    });

    // Return the data points and labels
    return {
      points: points,
      labels: labels,
      current: currentValue
    };
  },

  getHeader: function() {
    if (this.currentValue != null && this.data.header !== undefined)
    {
      return this.data.header + " " + this.currentValue.toFixed(2) + " " + this.config.yLabel;
    }
    else
    {
      return this.data.header;
    }
  },

  /**
   * Get the DOM element for Magic Mirror
   */
	getDom: function()
  {
    // Create wrapper element
    const wrapper = $('<div>');
    wrapper.css({position: 'relative', display: 'inline-block'});
    wrapper.width(this.config.width);
    wrapper.height(this.config.height);

    // Create chart canvas
    const influxchart = $('<canvas>');
    influxchart.attr('aria-label', this.config.ariaLabel);
    influxchart.attr('role', 'img');

    // Load the serie data
    var seriedata = this.getData();
    this.currentValue = seriedata.current;

    // Chart options
    var chartOptions = 
    {
      // Resize chart to parent element
      responsive: true,

      // Hide the serie legend
      legend:
      {
        display: false
      },
      
      scales:
      {
        // Configure the x axis
        xAxes: [
          {
            scaleLabel:
            {
              display: this.config.xLabelVisible,
              labelString: this.config.xLabel,
              fontColor: this.config.labelFontColor,
              fontSize: this.config.labelFontSize,
              fontFamily: this.config.labelFontFamily,
              lineHeight: this.config.labelLineHeight
            }
          }
        ],

        // Configure the y axis
        yAxes: [
          {
            scaleLabel:
            {
              display: this.config.yLabelVisible,
              labelString: this.config.yLabel,
              fontColor: this.config.labelFontColor,
              fontSize: this.config.labelFontSize,
              fontFamily: this.config.labelFontFamily,
              lineHeight: this.config.labelLineHeight,
            }
          }
        ]
      }
    }
    
    // Build the chart data
    var chartData = 
    {
      // Get the labels from the InfluxDB, these are timestamps
      labels: seriedata.labels,

      // Get the data points from the InfluxDB
      datasets: [{
        data: seriedata.points,
        backgroundColor: this.config.backgroundColor,
        borderColor: this.config.borderColor,
        borderWidth: this.config.borderWidth
      }]
    };

    // Build the actual configuration for the chart based on what we have
    var chartConfig = 
    {
      type: this.config.chartType,
      options: chartOptions,
      data: chartData,
    };

    // Initialize the Chart.js chart
    var chart = new Chart(influxchart.get(0).getContext('2d'), chartConfig);

    // Append chart to the wrapper
    wrapper.append(influxchart);

    // And return the DOM element of the wrapper
		return wrapper.get(0);
	}
});
