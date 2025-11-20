import * as LightweightCharts from 'lightweight-charts';
import * as sl from './series-source-lookup'; //sl - source lookup
import CSVParser, { TradeEvent } from '../utils/csv-parser';
import { ChartDropdown, ChartItem } from './chart-dropdown';


interface SeriesInstance<TSeriesType extends LightweightCharts.SeriesType> {
    suffix?: string;
    seriesSource: sl.SeriesSource;
    seriesType: TSeriesType;
    series: LightweightCharts.ISeriesApi<TSeriesType>;
    data?: LightweightCharts.SeriesDataItemTypeMap[TSeriesType][];
    legendElement: HTMLElement;
}

// ============================================================================
// Series Factory Functions
// ============================================================================

/**
 * Creates a line series with consistent scale margins.
 * Used for all trend lines and indicators displayed as lines.
 */
function addLineSeries(
  chart: LightweightCharts.IChartApi,
  options?: LightweightCharts.SeriesPartialOptionsMap["Line"],
  paneIndex?: number
): LightweightCharts.ISeriesApi<"Line"> {
    const series = chart.addSeries(LightweightCharts.LineSeries, options);
    
    series.priceScale().applyOptions({
        scaleMargins: {
            top: 0.1,
            bottom: 0.4,
        },
    });

    if (paneIndex) {
        series.moveToPane(paneIndex)
    }
    
    return series;
}

/**
 * Creates a volume histogram series with a consistent price scale
 */
function addHistogramSeries(
  chart: LightweightCharts.IChartApi,
  options?: LightweightCharts.SeriesPartialOptionsMap["Histogram"],
  paneIndex?: number
): LightweightCharts.ISeriesApi<"Histogram"> {
    const series = chart.addSeries(LightweightCharts.HistogramSeries, options);
    
    series.priceScale().applyOptions({
        scaleMargins: {
            top: 0.7,
            bottom: 0,
        },
    });

    if (paneIndex) {
        series.moveToPane(paneIndex)
    }
    
    return series;
}

/**
 * Creates a candlestick series configured for optimal price display.
 * Sets scaling options to prevent rendering issues.
 */
function addCandlestickSeries(
  chart: LightweightCharts.IChartApi,
  options?: LightweightCharts.SeriesPartialOptionsMap["Candlestick"],
  paneIndex?: number
): LightweightCharts.ISeriesApi<"Candlestick"> {
    const series = chart.addSeries(LightweightCharts.CandlestickSeries, options);
    
    series.priceScale().applyOptions({
        autoScale: true, // Note: Setting to false causes a bug where chart doesn't render sometimes
        scaleMargins: {
            top: 0.1,
            bottom: 0.4,
        },
    });

    if (paneIndex) {
        series.moveToPane(paneIndex)
    }
    
    return series;
}

function createTradeEventMarkers(
    tradeEvents: TradeEvent[]
): LightweightCharts.SeriesMarkerBar<LightweightCharts.Time>[] {
    const markers: LightweightCharts.SeriesMarkerBar<LightweightCharts.Time>[] = [];

    for (const tradeEvent of tradeEvents) {
        const event_time = tradeEvent.time
        const event_string = tradeEvent.event

        if (event_string.includes('LongEntry')) {
            markers.push({
                time: event_time,
                position: 'belowBar',
                color: '#2196F3',
                shape: 'arrowUp',
                text: 'Long',
            });
        }

        if (event_string.includes('ShortEntry')) {
            markers.push({
                time: event_time,
                position: 'aboveBar',
                color: '#FF5733',
                shape: 'arrowDown',
                text: 'Short',
            });
        }

        if (event_string.includes('LongExit')) {
            markers.push({
                time: event_time,
                position: 'belowBar',
                color: '#2196F3',
                shape: 'circle',
                text: '  ',
            });
        }

        if (event_string.includes('ShortExit')) {
            markers.push({
                time: event_time,
                position: 'aboveBar',
                color: '#FF5733',
                shape: 'square',
                text: '  ',
            });
        }
    }
    return markers;
}

/**
 * Create legend element for a simple series.
 */
function createLegendElement(): HTMLElement {
    const legendDiv = document.createElement('div');
    legendDiv.classList.add('legend');
    return legendDiv;
}

/**
 * Create legend element to hold all series for a particular indicator.
 */
function createLegendGroupDiv(): HTMLElement {
    const div = document.createElement('div');
    div.className = 'legend-group';
    return div;
}

/**
 * Create symbol for a group div
 */
function createGroupSymbolElement(symbol: string): HTMLElement {
    const symElement = document.createElement('span');
    symElement.className = 'legend-sym';
    symElement.textContent = symbol + ':';
    return symElement;
}

function createSeriesInstance(
    seriesSource: sl.SeriesSource,
    seriesType: 'Candlestick',
    chart: LightweightCharts.IChartApi,
    seriesOptions?: LightweightCharts.SeriesPartialOptionsMap["Candlestick"],
    paneIndex?: number,
    suffix?: string
): SeriesInstance<'Candlestick'> | undefined;

function createSeriesInstance(
    seriesSource: sl.SeriesSource,
    seriesType: 'Histogram',
    chart: LightweightCharts.IChartApi,
    seriesOptions?: LightweightCharts.SeriesPartialOptionsMap["Histogram"],
    paneIndex?: number,
    suffix?: string
): SeriesInstance<'Histogram'> | undefined;

function createSeriesInstance(
    seriesSource: sl.SeriesSource,
    seriesType: 'Line',
    chart: LightweightCharts.IChartApi,
    seriesOptions?: LightweightCharts.SeriesPartialOptionsMap["Line"],
    paneIndex?: number,
    suffix?: string
): SeriesInstance<'Line'> | undefined;

function createSeriesInstance<TSeriesType extends LightweightCharts.SeriesType>(
    seriesSource: sl.SeriesSource, 
    seriesType: TSeriesType,
    chart: LightweightCharts.IChartApi,
    seriesOptions?: LightweightCharts.SeriesPartialOptionsMap[TSeriesType],
    paneIndex?: number,
    suffix?: string
): SeriesInstance<TSeriesType> | undefined;

/**
 * Create a new SeriesIntance object. 
 * Takes the all require parameters to create the core ISeriesAPI
 */
function createSeriesInstance<TSeriesType extends LightweightCharts.SeriesType>(
    seriesSource: sl.SeriesSource, 
    seriesType: TSeriesType,
    chart: LightweightCharts.IChartApi,
    seriesOptions?: LightweightCharts.SeriesPartialOptionsMap[TSeriesType],
    paneIndex?: number,
    suffix?: string
): SeriesInstance<TSeriesType> | undefined {
    let series;

    switch (seriesType) {
        case 'Candlestick':
            series = addCandlestickSeries(chart);
            break;
        case 'Histogram':
            series = addHistogramSeries(chart, seriesOptions);
            break;
        case 'Line':
            series = addLineSeries(chart, seriesOptions, paneIndex);
            break;
        default:
            console.error('Unhandled series type:', seriesType);
            (series as never);
            return undefined;
    }

    return {
        suffix: suffix,
        seriesSource: seriesSource,
        seriesType: seriesType,
        series: series as LightweightCharts.ISeriesApi<TSeriesType>,
        legendElement: createLegendElement()
    };
}

type BbAndDc = Extract<sl.SeriesSource, `bb_${string}` | `dc_${string}`>

function getSourceOptions<S extends BbAndDc>(
    source: S, num: number
): LightweightCharts.SeriesPartialOptionsMap[sl.SeriesSources[S]] {
    const sourceColorMap = {
        'bb_ul': ['#87312b', '#c22929', '#dc7369'],
        'bb_m': ['#9e9e00', '#ffff00', '#feff83'],
        'dc_ul': ['#181577', '#2e29c2', '#5f73da'],
        'dc_m': ['#273186', '#800080', '#a95ea7']
    }

    const sourceOptions = {...sl.SeriesSourceConfigs[source]['seriesOptions']}
    switch (source) {
        case 'bb_upper':
        case 'bb_lower':
            sourceOptions.color = sourceColorMap['bb_ul'][num]
            break;
        case 'bb_middle':
            sourceOptions.color = sourceColorMap['bb_m'][num]
            break;
        case 'dc_upper':
        case 'dc_lower':
            sourceOptions.color = sourceColorMap['dc_ul'][num]
            break;
        case 'dc_middle':
            sourceOptions.color = sourceColorMap['dc_m'][num]
            break;
        }

    return sourceOptions
}

/**
 * Adds and manages ISeriesAPI object of the associated IChartApi object 
 * through SeriesInstance objects.
 */
export class SeriesManager {
    private seriesInstances: Map<string, SeriesInstance<LightweightCharts.SeriesType>>;
    private chartDropdown: ChartDropdown;
    
    constructor(private chart: LightweightCharts.IChartApi, private legendsDiv: HTMLDivElement) {
        this.seriesInstances = new Map();

        // Initialize chart dropdown with callback to update series visibility based on user selection
        this.chartDropdown = new ChartDropdown('dropdownList', (selectedSeries) => {
            for (const key of this.seriesInstances.keys()) {
                this.toggleSeriesVisibility(key, selectedSeries.has(key))
            }
        });
    }

    updateAll(csvText: string): boolean {
        const csvParser = new CSVParser(csvText);

        const seriesInstances = this.addSeriesFromCsv(csvParser);

        if (seriesInstances.size === 0) {
            return false;
        }

        this.cleanup();

        this.seriesInstances = seriesInstances;

        this.setSeriesData(csvParser);
        this.updateUI()

        return true;
    }

    private addSeriesFromCsv(csvParser: CSVParser): Map<string, SeriesInstance<LightweightCharts.SeriesType>> {
		const rawCsvHeaders = csvParser.getHeaders();
        const seriesInstances = new Map();

        const sourceCount: {[S in sl.SeriesSource]: number} = {
            'candlestick': 0,
            'volume': 0,
            'bb_upper': 0,
            'bb_middle': 0,
            'bb_lower': 0,
            'dc_upper': 0,
            'dc_middle': 0,
            'dc_lower': 0,
            'adx': 0,
            'plusDi': 0,
            'minusDi': 0,
            'aer': 0,
            'atr': 0,
            'ama': 0,
        }

        const ohlc = ['open', 'high', 'low', 'close'];
        const allOhlcPresent = ohlc.every(c => rawCsvHeaders.includes(c));

        if (allOhlcPresent) {
            const seriesInstance = createSeriesInstance(
                            'candlestick',
                            'Candlestick',
                            this.chart,
                            sl.SeriesSourceConfigs['candlestick']['seriesOptions']
                        )
            if (seriesInstance) {
                seriesInstances.set('candlestick',seriesInstance)
                sourceCount['candlestick']++
            };
        } else {
            // If ever making a production version, consider adding a fallback here
            console.error('Missing one or more OHLC columns: ', ohlc);
        }

        for (const header of rawCsvHeaders) {
            const matchingSource = (Object.keys(sl.SeriesSources) as sl.SeriesSource[]).find(s => header.startsWith(s))
            if (!matchingSource) {
                continue
            }
            
            const suffix = header.slice(matchingSource.length)
            switch (matchingSource) {
                case 'adx':
                case 'plusDi':
                case 'minusDi':
                case 'aer':
                case 'atr': {
                    const seriesInstance = createSeriesInstance(
                            matchingSource,
                            sl.SeriesSources[matchingSource],
                            this.chart,
                            sl.SeriesSourceConfigs[matchingSource]['seriesOptions'],
                            this.getPaneIndex(matchingSource, seriesInstances),
                            suffix
                        )
                    if (seriesInstance) {
                        seriesInstances.set(header, seriesInstance)  
                        sourceCount[matchingSource]++
                    }
                    break;
                }     
                case 'ama': {
                    const seriesInstance = createSeriesInstance(
                            matchingSource, 
                            sl.SeriesSources[matchingSource], 
                            this.chart,
                            sl.SeriesSourceConfigs[matchingSource]['seriesOptions'],
                            undefined,
                            suffix
                            
                        )   
                    if (seriesInstance) {
                        seriesInstances.set(header, seriesInstance)
                        sourceCount[matchingSource]++
                    }
                    break;
                }
                case 'bb_upper':
                case 'bb_middle':
                case 'bb_lower':
                case 'dc_upper':
                case 'dc_middle':
                case 'dc_lower': {
                    const seriesInstance = createSeriesInstance(
                            matchingSource, 
                            sl.SeriesSources[matchingSource], 
                            this.chart, 
                            getSourceOptions(matchingSource, sourceCount[matchingSource]),
                            undefined,
                            suffix
                            
                        )   
                    if (seriesInstance) {
                        seriesInstances.set(header, seriesInstance)
                        sourceCount[matchingSource]++
                    }
                    break;
                }
                default: {
                    const seriesInstance = createSeriesInstance(
                            matchingSource, 
                            sl.SeriesSources[matchingSource], 
                            this.chart, 
                            sl.SeriesSourceConfigs[matchingSource]['seriesOptions'],
                            undefined,
                            suffix
                            
                        )   
                    if (seriesInstance) {
                        seriesInstances.set(header, seriesInstance)
                        sourceCount[matchingSource]++
                    }
                    break;
                }
            }
        }

        if (seriesInstances.size == 0) {
            console.error('No valid series found in CSV headers:', rawCsvHeaders);
        }

        return seriesInstances;
    }

    /**
     * Returns the pane index for a given series source.
     * Use index for existing pane if a series from same source is already present,
     * otherwise returns the next available pane index.
     * Applies only to non-main panes (e.g. DMI, AER).
     */
    private getPaneIndex<T extends 'adx' | 'plusDi'| 'minusDi' | 'aer' | 'atr'>(
        seriesSource: T, 
        seriesInstances: Map<string, SeriesInstance<LightweightCharts.SeriesType>>
    ): number {
        const seriesGroup = sl.SeriesSourceConfigs[seriesSource].indicator ?? seriesSource

        for (const instance of seriesInstances.values()) {
            const instanceGroup = sl.SeriesSourceConfigs[instance.seriesSource].indicator ?? instance.seriesSource

            if (instanceGroup === seriesGroup) {
                return instance.series.getPane().paneIndex();
            }
        }

        return this.chart.panes().length;
    }

    private setSeriesData(csvParser: CSVParser) {
        for (const [key, seriesInstance] of this.seriesInstances.entries()) {
            switch (seriesInstance.seriesType) {
                case 'Candlestick':
                    seriesInstance.data = csvParser.parseCandlestickData();
                    break;
                case 'Histogram':
                    seriesInstance.data = csvParser.parseHistogramData(key);
                    break;
                case 'Line':
                    seriesInstance.data = csvParser.parseLineData(key);
                    break;
                default:
                    console.error('Encountered unknown series type while parsing data: ', seriesInstance.seriesType);
                    (seriesInstance.seriesType as never);
                    seriesInstance.data = [];
                    break;
            }
            // ensure we never call setData with undefined
            seriesInstance.series.setData(seriesInstance.data)
        }

        this.addTradeEventMarkers(csvParser);
    }

    private updateUI() {

        // ===== Dropdown Menu =====

        const chartItems: ChartItem[] = [];
        this.seriesInstances.forEach((instance, key) => {
            const suffix = instance.suffix || undefined
            const sourceConfig = sl.SeriesSourceConfigs[instance.seriesSource]
            const configLabel = sourceConfig['label']
            const indicator = sourceConfig['indicator']

            const label = suffix ? configLabel + ` ${suffix}` : configLabel

             let group;
             if (indicator) {
                const indicatorId = suffix ? indicator + `_${suffix}` : indicator
                const indicatorLabel = suffix ? sl.Indicators[indicator] + ` ${suffix}` : sl.Indicators[indicator]
                group = {id: indicatorId, label: indicatorLabel}
             }

            chartItems.push({
                id: key,
                label: label,
                group: group
            }) 
        });

        this.chartDropdown.update(chartItems);


        //===== Legends =====

        const groupedSources = [...this.seriesInstances.values()].reduce<Map<string, HTMLElement[]>>(
        (acc, instance) => {
            const sourceGroup = sl.SeriesSourceConfigs[instance.seriesSource].indicator ??
             instance.seriesSource;

            const legendElement = instance.legendElement;

            const existing = acc.get(sourceGroup);
            if (existing) {
            existing.push(legendElement);
            } else {
            acc.set(sourceGroup, [legendElement]);
            }

            return acc;
        }, new Map<string, HTMLElement[]>());

        // Add legends to legendsDiv
        for (const [sourceGroup, legends] of groupedSources.entries()) {
            const groupDiv = createLegendGroupDiv();

            const groupSymbol = sourceGroup.slice(0, 2);
            groupDiv.appendChild(createGroupSymbolElement(groupSymbol.toUpperCase()))

            legends.forEach(l => groupDiv.appendChild(l));

            this.legendsDiv.appendChild(groupDiv);
        }

        this.chart.timeScale().fitContent();
    }

    private cleanup() {
        for (const seriesInstance of this.seriesInstances.values()) {
			this.chart.removeSeries(seriesInstance.series);

            seriesInstance.legendElement.remove();
        }

        // Ensure any untracked legends are removed
        this.legendsDiv.replaceChildren();
    }

    crosshairMoveHandler(param: LightweightCharts.MouseEventParams) {
        if (!param.time) {
            return;
        }
        
        for (const seriesInstance of this.seriesInstances.values()) {
            const dataPoint = param.seriesData.get(seriesInstance.series);
            if (dataPoint) {
                const priceFormatter = seriesInstance.series.priceFormatter()
                const formateData = sl.SeriesSourceConfigs[seriesInstance.seriesSource].formatData
                seriesInstance.legendElement.textContent = formateData(priceFormatter, dataPoint)
            }
        }
    }

    addTradeEventMarkers(csvParser: CSVParser) {
        // Set trade events markers if available in data
        if (csvParser.getHeaders().includes('event')) {
            const candlestickSeries = this.seriesInstances.get('candlestick')
            if (!candlestickSeries) {
                return
            }

            const tradeSeriesMarkers = LightweightCharts.createSeriesMarkers(candlestickSeries.series);
            tradeSeriesMarkers.setMarkers(createTradeEventMarkers(csvParser.parseTradeEvents()));
        }
    }
    
    toggleSeriesVisibility(key: string, visible: boolean): void {
        this.seriesInstances.get(key)?.series.applyOptions({ visible });
    }
}