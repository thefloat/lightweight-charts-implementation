// External libraries
import * as LightweightCharts from 'lightweight-charts';

// Local utils
import { CSVLoader } from '../utils/csv-loader';

// Local config and types
import {
    SeriesManager,
    SeriesKey
} from './series-config'

// DOM elements and application variables
const fileInput = document.getElementById('csvFileInput') as HTMLInputElement;
const refreshButton = document.getElementById('refresh') as HTMLButtonElement;
const legendDiv = document.getElementById('legendsDiv') as HTMLDivElement;
let lastLoadedSource: string | File = 'data/btc_usdt_nov_5d.csv';

// Chart creation and configuration
function createChart(): LightweightCharts.IChartApi {
    const chartElement = document.getElementById('chartArea');
    if (!chartElement) {
        throw new Error('Chart container element not found');
    }

    const chart = LightweightCharts.createChart(
        chartElement,
        {
            layout: {
                background: { color: '#222' },
                textColor: "#C3BCDB",
            },
            grid: {
                vertLines: { color: '#444' },
                horzLines: { color: '#444' },
            },
            autoSize: true,
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
            },
        }
    );

    chart.priceScale('right').applyOptions({
        borderColor: '#71649C',
    });

    chart.timeScale().applyOptions({
        borderColor: '#71649C',
        timeVisible: true,
        secondsVisible: true,
    });

    return chart;
}
// Initialize chart
const chart = createChart();
const seriesManager = new SeriesManager(chart);

// Data loading function
async function loadChartData(source: string | File): Promise<void> {
    try {
        let csvText: string;
        if (source instanceof File) {
            csvText = await source.text();
        } else {
            const loadedText = await CSVLoader.loadCSVText(source);
            if (loadedText === null) {
                throw new Error('Failed to load CSV file');
            }
            csvText = loadedText;
        }

        lastLoadedSource = source;

        seriesManager.updateAllSeriesData(csvText, legendDiv);

        chart.timeScale().fitContent();
    } catch (error) {
        console.error('Error loading CSV data:', error);
    }
}

chart.subscribeCrosshairMove((param: LightweightCharts.MouseEventParams) => {
    Object.entries(seriesManager.getAllInstances()).forEach(([key, seriesInstance]) => {
        if (param.time) {
            const dataPoint = param.seriesData.get(seriesInstance.series)
            if (dataPoint) {
                seriesManager.updateLegend(key as SeriesKey, dataPoint);
            } else {
                seriesManager.updateLegend(key as SeriesKey);
            }
        }
    });
});

// Event listeners
fileInput.addEventListener('change', (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
        loadChartData(file);
    }
});

// Add refresh button event listener after other event listeners
refreshButton.addEventListener('click', () => loadChartData(lastLoadedSource));

// Initial load with default file (Production testing...)
loadChartData(lastLoadedSource);