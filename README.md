# Data For Progress
## Presidential Primary First Debate Survey Results

Data for Progress is the think tank for the future of progressivism. Their goal is to show how a progressive agenda can win nationwide.

They provide research, polling on left issues and analysis to support activists and advocacy groups, challenging conventional wisdom about the American public that lack empirical support.

This app features data from their Presidential Primary First Debate survey. It was fielded in July 2019 by YouGov Blue on behalf of Data for Progress.

## The Project

The data is fetched from [a separate app](https://2019-dfp-datasette.glitch.me/csv-data) running [Datasette](https://simonwillison.net/2019/Apr/23/datasette-glitch/).  Datasette provides data journalists with a web application for exploring and querying large sets of data, and includes convenient tools for converting CSV files into a SQLite database.

We use Chart.js to generate the bar graphs. Don't worry if you're not already familiar with Chart.js - we have [a tutorial](https://glitch.com/culture/get-started-with-dataviz-using-chart-js/) that steps through a real, working project that you can use to get up to speed.]

## File Structure

You can edit `script.js`, `style.css`, and `index.html` to change the app and make it your own.

`script.js` is the file that works with the data source.
- This is where the data is fetched from [the Datasette](https://2019-dfp-datasette.glitch.me/csv-data).
 - It uses the selected topic and any filters to build an SQL query and collect results
- With the results it uses [Chart.js](https://www.chartjs.org/) to render the bar graph.
  - Take a peek at the [Chart.js docs](https://www.chartjs.org/docs/latest/) and change the `drawChart` function in `script.js` to visualize the data using different types of graphs.

`style.css` is where the styling is controlled. 
- This includes the layout, fonts, colors.

`index.html` controls the selectors you see!
- This is where you can add more filters, or change up the questions. 
  - There's a example of how to do that inside the file!

## Make your own!

This survey generated a lot of data, and not all of it is shown on this app. Fortunately, with Glitch you can make your own version and explore further! Here's how.

First of all, [remix this app](https://glitch.com/edit/#!/remix/2019-dfp-debate-results)! Remixing will create your own copy of the app that is unique to you -- any changes you make will only apply to your version. Make sure you change the description in your version so you remember what the app does when you're looking at it later.

### Changing filters

To dig into the data you will need to add topics and/or demographic filters. You can make these changes in `index.html`.

- The topics live in `index.html` starting on line 39. There is an example showing how to add a new topic starting on line 73. For a list of topics, see `topic-abbrevs.md`.
- The demographics live in `index.html` starting on line 87. There is an example showing how to add a new demographic option on line 154. For a full list of demographic options, see `topic-abbrevs.md`. NOTE: if you are adding or changing demographic filters, you must also update the list in `script.js` as shown on line 56.

### Other changes

Here are other  ideas for ways to make your own app:

1. Change the colors of the chart in in `script.js`.
2. Add custom chart behavior using [Configurations](https://www.chartjs.org/docs/latest/configuration/) in `script.js`.
3. Change the [type of chart](https://www.chartjs.org/docs/latest/charts/) in `script.js`.


## Made by [Glitch](https://glitch.com/)

**Glitch** is the friendly community where you'll build the app of your dreams. Glitch lets you instantly create, remix, edit, and host an app, bot or site, and you can invite collaborators or helpers to simultaneously edit code with you.

Find out more [about Glitch](https://glitch.com/about).