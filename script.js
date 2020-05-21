/*
================================================================================
GLOBAL VARIABLES
================================================================================
*/

const baseUrl =
  "https://2019-dfp-datasette.glitch.me/data.json"; /* The link to our datasette */

/*    Here we set the weighting we want to visualize for the app.
 *
 *    What is weighting?
 *   "Weighting adjusts the poll data in an attempt to ensure that the sample more accurately reflects
 *   the characteristics of the populationfrom which it was drawn."
 *   Learn more: https://www.aapor.org/Education-Resources/For-Researchers/Poll-Survey-FAQ/Weighting.aspx
 *
 *   Each response in the data has different weights against the full sample, or pre-debate and  post-debate.
 *
 *   The options are: weight_fullsample, weight_predebate, weight_postdebate
 */

const weighting = "weight_predebate";

/*    Sets the minimum sample size to show a chart.
 *    Below 50 responses, and there isn't statistical significance.
 *    We don't want to draw false conculsions from displaying such a small group. */

const minSample = 50;

let topicChart;

/*
================================================================================
CREATE ASK DROPDOWN
================================================================================
*/

const topicSelection = new SlimSelect({ select: "#topic", showSearch: false });

/*
================================================================================
CREATE DEMOGRAPHIC FILTER DROPDOWNS
================================================================================
*/

/*  Initialize globals and the "Slim Select" dropdowns
 *  This makes the demographics <select> full width and adds the option for search (we're not currently using it) */

const demographics = [
  createDemographic("age5", "#age5"),
  createDemographic("race4", "#race4"),
  createDemographic("Gender", "#gender"),
  createDemographic("educ4", "#educ4"),
  createDemographic("ideo3", "#ideo3"),

  /* To add another demographic,
   * make sure you initialize another slimselect like this:
   *
   * createDemographic('urbancity', '#urbancity'),
   */
];

function createDemographic(name, dropdownCssSelector) {
  return {
    slimSelect: new SlimSelect({
      select: dropdownCssSelector,
      showSearch: false /* This is where you can enable search, if you'd like. */
      /* See all possible options: http://slimselectjs.com/options */
    }),
    name
  };
}

/*
================================================================================
HELPERS: Event handlers
================================================================================
*/

async function updateCharts(event) {
  if (topicChart) {
    /*  Destroys the old chart to make way for the new one and clear the sample-size string. */
    topicChart.destroy();
  }
  const sampleSizeString = document.getElementById("sample-size");
  sampleSizeString.innerHTML = "";

  toggleLoadingIndicator(); /*  Show the spinner because we're loading results. */

  const chartData = await getChartData();

  toggleLoadingIndicator(); /* Hide the spinner when we're ready to display the results. */

  drawChart(chartData);
}

document.addEventListener("DOMContentLoaded", function() {
  /* This shows a graph on initial load
   * To change the initial question, go to index.html and find the topic-select
   * Move the 'selected' attribute from the current one, to your desired question */
  updateCharts();
});

let selects = document.getElementsByClassName("form-select");
Array.from(selects).forEach(select => {
  /* This updates the chart whent the selects are changed */
  select.addEventListener("change", function() {
    updateCharts();
  });
});

/*
================================================================================
HELPERS: Data-related functions
================================================================================
*/

async function getChartData() {
  /*  Fetch the data. */
  const selectedTopic = topicSelection.selected();
  const selectedQuestion = topicSelection.selected("text");
  const sampleData = await fetchData(
    selectedTopic,
    getSelectedClause()
  ); /* Get the demographic group data */
  const populationData = await fetchData(
    selectedTopic,
    ""
  ); /*  Get the population data */

  /*  Used for the population text in the chart.
   *   The total number will change from question to question,
   *   because not all respondents answered every question
   *   and the responses are weighted.  */

  const sampleSize = getGroupSize(sampleData);
  const populationSize = getGroupSize(populationData);

  const histogram = buildHistogram(sampleData, populationData);

  const labels = Object.keys(histogram);
  const dataCounts = Object.values(histogram);
  const sampleCounts = dataCounts.map(row =>
    row.sampleCount ? row.sampleCount : 0
  );
  const populationCounts = dataCounts.map(row =>
    row.populationCount ? row.populationCount : 0
  );

  return {
    labels,
    sampleCounts,
    sampleSize,
    populationCounts,
    populationSize
  };
}

async function fetchData(topic, clause) {
  /* This is where we build the SQL query
   *
   * ${baseUrl} = url that we fetch the data from. This is set at the top of the file.
   * ${topic} = the survey question selected
   * ${clauseString} = the demographics being filtered. (if no demographics are selected, it's left empty) */

  const clauseString = clause === "" ? clause : clause.clauseString;

  const urlString = `${baseUrl}?sql=SELECT%0D%0A++s.Response%2C%0D%0A++%28SELECT+COALESCE%28SUM%28r.${weighting}%29%2C0%29+FROM+results+r+WHERE+r.${topic}+%3D+s.Value${clauseString}+%29%2C%0D%0A++%28SELECT++COALESCE%28SUM%28r.${weighting}%29%2C0%29+FROM+results+r+WHERE+r.${topic}+%3D+s.Value%29%0D%0AFROM+schema+s+WHERE+s.Variable+%3D+"${topic}"`;
  
  const response = await fetch(urlString);
  const json = await response.json();

  return json.rows;
}

function getSelectedClause() {
  const clauseObject = new Object();
  clauseObject.clauseString = "";

  const clauseParts = [];

  for (const demographic of demographics) {
    const selectorValue = demographic.slimSelect.selected();

    if (selectorValue === "") {
      continue;
    }

    const value = encodeURIComponent(selectorValue);

    let clauseString = `+AND+${demographic.name}+%3D+${value}`;

    clauseParts.push(clauseString);
  }

  clauseObject.clauseString = clauseParts.join("");

  return clauseObject;
}

function getGroupSize(data) {
  /* console.table(data); */
  let accumulator = 0;

  data.forEach(row => {
    accumulator += row[1];
  });

  return accumulator;
}

/* The buildHistogram() function does the following things:
 *
 * 1. Make sure it collects all labels for the graph, where labels are the
 *    answers chosen by the respondent;
 * 2. For each label, collect the number of respondents in the sample group;
 * 3. For each label, collect the number of respondents in the full population.
 *
 * Complicating this task are a couple of scenarios:
 *
 * - It's possible that there are labels included in one dataset (i.e., sample
 *   group) that are not included in the other (i.e., population).
 * - It's possible that the labels are in fact a combination of labels, as in the
 *   case of multiple-choice questions. These must be split into unique labels,
 *   and are separated by a semi-colon (';').
 * - In the case of multiple-choice questions, it's likely that as we parse the
 *   the dataset we'll come across the same entry more than once.
 */
function buildHistogram(sampleData, populationData) {
  /* We return a surveyData object that looks like
   * {
   *   'Label 1': {
   *     sampleCount: Number,
   *     populationCount: Number
   *   },
   *   'Label 2': {
   *     sampleCount: Number,
   *     populationCount: Number
   *   }
   * }
   */

  const surveyData = new Object();
  const labelSet = new Set();

  /* First, we'll process the dataset from the sample group. */
  sampleData.forEach(row => {
    // If labels are from multiple-choice questions, the combination needs to be split:
    // 'Label one;Label two;Label three' ~> ['Label one', 'Label two', 'Label three']
    const labels = row[0].split(";");

    labels.forEach(label => {
      labelSet.add(label);

      /* Check to see if the surveyData object already has the label property; if it
       * does, increment the value for the label's sampleCount property. If it doesn't,
       * we create the object and assign its sampleCount property to the current value. */

      if (surveyData[label]) {
        if (surveyData[label].sampleCount) {
          surveyData[label].sampleCount += row[1];
        } else {
          Object.defineProperty(surveyData[label], "sampleCount", {
            value: row[1],
            writable: true
          });
        }
      } else {
        surveyData[label] = new Object();
        surveyData[label].sampleCount = row[1];
      }
    });
  });

  /* Then we run through the population group, because it may include additional
     labels that weren't in the sample group (and vice-versa). */
  populationData.forEach(row => {
    const labels = row[0].split(";");

    labels.forEach(label => {
      labelSet.add(label);

      /* Check to see if the surveyData object already has the label property; if it
       * does, we then check to see if it already has the populationCount property (it might
       * only have sampleCount on the first run) and increment its value. If it doesn't,
       * we define the populationCount property and set it to the current value. If the
       * label property doesn't yet exist, we create the object and assign its populationCount
       * property to the current value. */

      if (surveyData[label]) {
        if (surveyData[label].populationCount) {
          surveyData[label].populationCount += row[1];
        } else {
          Object.defineProperty(surveyData[label], "populationCount", {
            value: row[1],
            writable: true
          });
        }
      } else {
        surveyData[label] = new Object();
        surveyData[label].populationCount = row[1];
      }
    });
  });

  return surveyData;
}

/*
================================================================================
HELPERS: Chart rendering-related functions
================================================================================
*/

function getPercentage(count, total) {
  return (100 * count) / total;
}

function drawChart(chartData) {
  const {
    labels,
    sampleCounts,
    sampleSize,
    populationCounts,
    populationSize
  } = chartData;

  const sampleSizeString = document.getElementById("sample-size");

  sampleSizeString.innerHTML = generateSampleSizeText(
    sampleSize,
    populationSize
  );

  /* Don't load the chart if the sample is below the statistical limit
   * The minimum number is set at the top of the file
   */
  if (sampleSize < minSample) {
    return;
  }
  /*  These are the colors for the bars.
   *   You can add your own colors to customize the graph.
   */

  const lightColor = `#ffc46b`;
  const darkColor = `#d527b7`;

  const canvasContext = document.getElementById("chart").getContext("2d");

  /* This checks if any filters are selected or not.
   * By default the chart displays a single bar chart with the answers of the entire population.
   * If a filter demographic is selected, it displays 2 bar charts that compare the sample vs entire population
   */
  const datasets = [
    {
      data: populationCounts.map(count => getPercentage(count, populationSize)),
      backgroundColor: darkColor,
      borderColor: darkColor,
      borderWidth: 1,
      label: "All Responses"
    }
  ];

  if (sampleSize != populationSize) {
    datasets.unshift({
      data: sampleCounts.map(count => getPercentage(count, sampleSize)),
      backgroundColor: lightColor,
      borderColor: lightColor,
      borderWidth: 1,
      label: "Selected Group"
    });
  }

  /* This builds our chart! */
  topicChart = new Chart(canvasContext, {
    /* See all chart types: https://www.chartjs.org/docs/latest/charts/ */
    type: "horizontalBar",
    data: {
      labels: labels,
      datasets: datasets
    },
    /* See all options: https://www.chartjs.org/docs/latest/general/options.html */

    options: {
      aspectRatio: 1.5,
      responsive: true,
      tooltips: {
        callbacks: {
          label: function(tooltipItem, data) {
            var label = data.datasets[tooltipItem.datasetIndex].label || "";
            if (label) {
              label += ": ";
            }
            label += Math.round(tooltipItem.xLabel * 10) / 10;
            label += "%";
            return label;
          }
        }
      },
      scales: {
        xAxes: [
          {
            ticks: {
              min: 0,
              callback: (value, index, values) => {
                return value + "%";
              }
            }
          }
        ]
      }
    }
  });
}

/*
================================================================================
INTERACTION: Functions that control the UI
================================================================================
*/

function toggleLoadingIndicator() {
  /* The loader animation is from https://github.com/tobiasahlin/SpinKit */
  const spinnerDiv = document.querySelector(".spinner");
  const queryContainer = document.querySelector(".chart-container");

  if (spinnerDiv) {
    const bounceBlueDiv = document.querySelector(".double-bounce_1");
    const bounceRedDiv = document.querySelector(".double-bounce_2");
    bounceBlueDiv.remove();
    bounceRedDiv.remove();
    spinnerDiv.remove();
  } else {
    const spinnerDiv = document.createElement("div");
    const bounceBlueDiv = document.createElement("div");
    const bounceRedDiv = document.createElement("div");
    spinnerDiv.classList.add("spinner");
    bounceBlueDiv.classList.add("double-bounce_1");
    bounceRedDiv.classList.add("double-bounce_2");
    spinnerDiv.prepend(bounceBlueDiv);
    spinnerDiv.prepend(bounceRedDiv);
    queryContainer.prepend(spinnerDiv);
  }
}

function generateSampleSizeText(sampleSize, populationSize) {
  let selectedQuestion = displaySelectedTopic();
  if (sampleSize < minSample) {
    return `The number of people in this cross section of demographics is too low to draw conclusions from the responses.`;
  }
  /* Using Math.round here to because the weighting is in decimals, and the samples can look pretty bonkers. */
  return `Displaying ${Math.round(sampleSize)} of ${Math.round(
    populationSize
  )} total responses for the question: "<span class="selected-topic">${selectedQuestion}</span>"`;
}

function displaySelectedTopic() {
  var topic = document.getElementById("topic");

  if (topic.selectedIndex == -1) return null;

  return topic.options[topic.selectedIndex].text;
}
