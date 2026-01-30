/**
 * Centralized library imports for webview
 * Ensures all libraries are bundled into the VSIX package
 */

// jQuery
import $ from 'jquery';
// Make jQuery available globally for Bootstrap
(window as any).$ = $;
(window as any).jQuery = $;

// Bootstrap (includes CSS and JS)
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

// Lodash
import _ from 'lodash';

// Moment.js
import moment from 'moment';

// Chart.js
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register Chart.js components
Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Tabulator - using direct import approach
import 'tabulator-tables/dist/css/tabulator_bootstrap5.min.css';
const TabulatorModule = require('tabulator-tables');
const Tabulator = TabulatorModule.TabulatorFull || TabulatorModule;

// Tagify - Tags input library
import Tagify from '@yaireo/tagify';
import '@yaireo/tagify/dist/tagify.css';

// Export all libraries for use in components
export {
  $,
  _,
  moment,
  Chart,
  Tabulator,
  Tagify
};

// Also make them available globally for convenience
(window as any)._ = _;
(window as any).moment = moment;
(window as any).Chart = Chart;
(window as any).Tabulator = Tabulator;
(window as any).Tagify = Tagify;
