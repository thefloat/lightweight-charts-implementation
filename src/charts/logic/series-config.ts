import * as LightweightCharts from 'lightweight-charts';
import CSVParser, { TradeEvent } from '../utils/csv-parser';
import { ChartDropdown } from './chart-dropdown';


// ============================================================================
// Core Type Definitions
// ============================================================================

/**
 * Defines the core configuration and behavior of a chart series.
 * @template TSeriesType - The type of series (Candlestick, Line, etc.) that determines data structure
 */
interface SeriesDefinition<TSeriesType extends LightweightCharts.SeriesType> {
    label: string;
    seriesId: string;
    group?: string,
    formatData: (series: LightweightCharts.ISeriesApi<TSeriesType>, dataPoint: LightweightCharts.SeriesDataItemTypeMap[TSeriesType]) => string;
    createSeries: (chart: LightweightCharts.IChartApi) => LightweightCharts.ISeriesApi<TSeriesType>;
    parseData: (csvParser: CSVParser) => LightweightCharts.SeriesDataItemTypeMap[TSeriesType][];
    createLegendElement: () => HTMLElement;
}

/**
 * Runtime instance of a series, containing both its definition and current state
 */
interface SeriesInstance<TSeriesType extends LightweightCharts.SeriesType> {
    definition: SeriesDefinition<TSeriesType>;
    series: LightweightCharts.ISeriesApi<TSeriesType>;
    data?: LightweightCharts.SeriesDataItemTypeMap[TSeriesType][];
    legendElement: HTMLElement;
}

const candlestickColumns = ['open', 'high', 'low', 'close'] as const;

// ============================================================================
// Type Mapping and Utilities
// ============================================================================

/**
 * Maps series identifiers to their definitions. This serves as the source of truth
 * for all available series types in the application.
 */
export interface SeriesDefinitionMap {
    candlestick: SeriesDefinition<'Candlestick'>;
    volume: SeriesDefinition<'Histogram'>;
    bb_upper: SeriesDefinition<'Line'>;
    bb_middle: SeriesDefinition<'Line'>;
    bb_lower: SeriesDefinition<'Line'>;
    dc_upper: SeriesDefinition<'Line'>;
    dc_middle: SeriesDefinition<'Line'>;
    dc_lower: SeriesDefinition<'Line'>;
    adx: SeriesDefinition<'Line'>;
}

export type SeriesKey = keyof SeriesDefinitionMap;

// Utility type to extract series type from a key
type SeriesTypeFromKey<T extends SeriesKey> = 
    SeriesDefinitionMap[T] extends SeriesDefinition<infer U> ? U : never;

// Maps each series identifier to its corresponding instance type    
type SeriesInstanceMap = {
    [K in SeriesKey]: SeriesInstance<SeriesTypeFromKey<K>>;
};

// Series Grouping
export interface SeriesItem {
    id: SeriesKey;
    name: string;
}

export interface SeriesGroup {
    id: string;
    name: string;
    legendElement: HTMLElement;
    seriesItems: SeriesItem[];
}

const predefinedGroupSeries: Record<string, SeriesGroup> = {
    bollinger_bands: {
        id: 'bollinger_bands',
        name: 'Bollinger Bands',
        legendElement: createLegendGroupDiv(),
        seriesItems: [
            {id: 'bb_upper', name: 'BB Upper'},
            {id: 'bb_lower', name: 'BB Lower'},
            {id: 'bb_middle', name: 'BB Middle'},
        ]
    },
    donchian_channels: {
        id: 'donchian_channels',
        name: 'Donchian Channels',
        legendElement: createLegendGroupDiv(), 
        seriesItems: [
            {id: 'dc_upper', name: 'DC Upper'},
            {id: 'dc_lower', name: 'DC Lower'},
            {id: 'dc_middle', name: 'DC Middle'},
        ]
    }
} as const;

// ============================================================================
// Series Factory Functions
// ============================================================================

/**
 * Creates a line series with consistent styling and scale margins.
 * Used for all trend lines and indicators displayed as lines.
 */
function createLineSeries(chart: LightweightCharts.IChartApi, color: string, paneIndex?: number): LightweightCharts.ISeriesApi<"Line"> {
    const series = chart.addSeries(LightweightCharts.LineSeries, {
        color: color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
    });
    
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
 * Creates a volume histogram series with a dedicated price scale
 * and appropriate visual settings for volume display.
 */
function createVolumeSeries(chart: LightweightCharts.IChartApi): LightweightCharts.ISeriesApi<"Histogram"> {
    const series = chart.addSeries(LightweightCharts.HistogramSeries, {
        color: '#26a69a',
        priceFormat: {
            type: 'volume',
        },
        priceScaleId: '',
        priceLineVisible: false,
        lastValueVisible: false,
    });
    
    series.priceScale().applyOptions({
        scaleMargins: {
            top: 0.7,
            bottom: 0,
        },
    });
    
    return series;
}

/**
 * Creates a candlestick series configured for optimal price display.
 * Sets scaling options to prevent rendering issues.
 */
function createCandlestickSeries(chart: LightweightCharts.IChartApi): LightweightCharts.ISeriesApi<"Candlestick"> {
    const series = chart.addSeries(LightweightCharts.CandlestickSeries, {
        borderVisible: false,
    });
    
    series.priceScale().applyOptions({
        autoScale: true, // Note: Setting to false causes a bug where chart doesn't render sometimes
        scaleMargins: {
            top: 0.1,
            bottom: 0.4,
        },
    });
    
    return series;
}

function createTradeEventMarkers(tradeEvents: TradeEvent[]): LightweightCharts.SeriesMarkerBar<LightweightCharts.Time>[] {
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

function createLegendGroupDiv() {
    const div = document.createElement('div');
    div.className = 'legend-group';
    return div;
}

// ============================================================================
// Instance Creation Functions
// ============================================================================

/**
 * Factory functions for creating strongly-typed series instances.
 * These ensure proper typing and initialization of each series type.
 */
function createCandlestickInstance(chart: LightweightCharts.IChartApi): SeriesInstanceMap['candlestick'] {
    const definition = SeriesDefinitions.candlestick;
    return {
        definition,
        series: definition.createSeries(chart),
        legendElement: definition.createLegendElement()
    };
}

function createVolumeInstance(chart: LightweightCharts.IChartApi): SeriesInstanceMap['volume'] {
    const definition = SeriesDefinitions.volume;
    return {
        definition,
        series: definition.createSeries(chart),
        legendElement: definition.createLegendElement()
    };
}

function createLineInstance<K extends 'bb_upper' | 'bb_middle' | 'bb_lower' | 'dc_upper' | 'dc_middle' | 'dc_lower' | 'adx'>(
    key: K,
    chart: LightweightCharts.IChartApi
): SeriesInstanceMap[K] {
    const definition = SeriesDefinitions[key];
    return {
        definition,
        series: definition.createSeries(chart),
        legendElement: definition.createLegendElement()
    };
}

// ============================================================================
// Series Definitions Configuration
// ============================================================================

/**
 * Global configuration for all available series types.
 * Each entry defines how a specific series type should be created,
 * displayed, and how its data should be formatted.
 */
export const SeriesDefinitions: SeriesDefinitionMap = {
    candlestick: {
        label: 'O H L C',
        seriesId: 'candlestick',
        formatData: (series, data: LightweightCharts.WhitespaceData | LightweightCharts.CandlestickData) => {
            const fmt = series.priceFormatter();
            if ('open' in data) {
                return `O${fmt.format(data.open)} H${fmt.format(data.high)} L${fmt.format(data.low)} C${fmt.format(data.close)}`;
            }
            return '';
        },
        createSeries: (chart) => createCandlestickSeries(chart),
        parseData: (csvParser: CSVParser) => csvParser.parseCandlestickData(),
        createLegendElement: () => {
            const legendDiv = document.createElement('div')
            legendDiv.classList.add('legend');
            return legendDiv;
        },
    },
    volume: {
        label: 'Volume',
        seriesId: 'volume',
        formatData: (series, data: LightweightCharts.HistogramData | LightweightCharts.WhitespaceData) => {
            const fmt = series.priceFormatter();
            return 'value' in data ? `V${fmt.format(data.value)}` : '';
        },
        createSeries: (chart) => createVolumeSeries(chart),
        parseData: (csvParser: CSVParser) => csvParser.parseHistogramData('volume'),
        createLegendElement: () => {
            const legendDiv = document.createElement('div');
            legendDiv.classList.add('legend');
            return legendDiv;
        },
    },
    bb_upper: {
        label: 'Upper BB',
        seriesId: 'bb_upper',
        group: 'bollinger_bands',
        formatData: (series, data: LightweightCharts.LineData | LightweightCharts.WhitespaceData) => {
            const fmt = series.priceFormatter();
            return 'value' in data ? `U${fmt.format(data.value)}`: '';
        },
        createSeries: (chart) => createLineSeries(chart, '#FF5733'),
        parseData: (csvParser: CSVParser) => csvParser.parseLineData('bb_upper'),
        createLegendElement: () => {
            const legendDiv = document.createElement('div');
            legendDiv.classList.add('legend');
            return legendDiv;
        }
    },
    bb_middle: {
        label: 'Middle BB',
        seriesId: 'bb_middle',
        group: 'bollinger_bands',
        formatData: (series, data: LightweightCharts.LineData | LightweightCharts.WhitespaceData) => {
            const fmt = series.priceFormatter();
            return 'value' in data ? `M${fmt.format(data.value)}` : '';
        },
        createSeries: (chart) => createLineSeries(chart, '#F2D222'),
        parseData: (csvParser: CSVParser) => csvParser.parseLineData('bb_middle'),
        createLegendElement: () => {
            const legendDiv = document.createElement('div');
            legendDiv.classList.add('legend');
            return legendDiv;
        }
    },
    bb_lower: {
        label: 'Lower BB',
        seriesId: 'bb_lower',
        group: 'bollinger_bands',
        formatData: (series, data: LightweightCharts.LineData | LightweightCharts.WhitespaceData) => {
            const fmt = series.priceFormatter();
            return 'value' in data ? `L${fmt.format(data.value)}` : '';
        },
        createSeries: (chart) => createLineSeries(chart,  '#FF5733'),
        parseData: (csvParser: CSVParser) => csvParser.parseLineData('bb_lower'),
        createLegendElement: () => {
            const legendDiv = document.createElement('div');
            legendDiv.classList.add('legend');
            return legendDiv;
        }
    },
    dc_upper: {
        label: 'Upper Channel',
        seriesId: 'dc_upper',
        group: 'donchian_channels',
        formatData: (series, data: LightweightCharts.LineData | LightweightCharts.WhitespaceData) => {
            const fmt = series.priceFormatter();
            return 'value' in data ? `U${fmt.format(data.value)}` : '';
        },
        createSeries: (chart) => createLineSeries(chart, '#3380FF'),
        parseData: (csvParser: CSVParser) => csvParser.parseLineData('dc_upper'),
        createLegendElement: () => {
            const legendDiv = document.createElement('div');
            legendDiv.classList.add('legend');
            return legendDiv;
        }
    },
    dc_middle: {
        label: 'Middle Channel',
        seriesId: 'dc_middle',
        group: 'donchian_channels',
        formatData: (series, data: LightweightCharts.LineData | LightweightCharts.WhitespaceData) => {
            const fmt = series.priceFormatter();
            return 'value' in data ? `M${fmt.format(data.value)}` : '';
        },
        createSeries: (chart) => createLineSeries(chart, '#22F2D2'),
        parseData: (csvParser: CSVParser) => csvParser.parseLineData('dc_middle'),
        createLegendElement: () => {
            const legendDiv = document.createElement('div');
            legendDiv.classList.add('legend');
            return legendDiv;
        }
    },
    dc_lower: {
        label: 'Lower Channel',
        seriesId: 'dc_lower',
        group: 'donchian_channels',
        formatData: (series, data: LightweightCharts.LineData | LightweightCharts.WhitespaceData) => {
            const fmt = series.priceFormatter();
            return 'value' in data ? `L${fmt.format(data.value)}` : '';
        },
        createSeries: (chart) => createLineSeries(chart, '#3380FF'),
        parseData: (csvParser: CSVParser) => csvParser.parseLineData('dc_lower'),
        createLegendElement: () => {
            const legendDiv = document.createElement('div');
            legendDiv.classList.add('legend');
            return legendDiv;
        }
    },
    adx: {
        label: 'ADX',
        seriesId: 'adx',
        formatData: (series, data: LightweightCharts.LineData | LightweightCharts.WhitespaceData) => {
            const fmt = series.priceFormatter();
            return 'value' in data ? `ADX${fmt.format(data.value)}` : '';
        },
        createSeries: (chart) => createLineSeries(chart, '#3380FF', 1),
        parseData: (csvParser: CSVParser) => csvParser.parseLineData('adx'),
        createLegendElement: () => {
            const legendDiv = document.createElement('div');
            legendDiv.classList.add('legend');
            return legendDiv;
        }
    }
}

export function isValidSeriesKey(id: string): id is SeriesKey {
    return id in SeriesDefinitions;
}

// ============================================================================
// Series Management Implementation
// ============================================================================

/**
 * Manages the lifecycle and state of all chart series.
 * Provides type-safe access to series instances and handles their visibility and updates.
 */
export class SeriesManager {
    private seriesInstances: SeriesInstanceMap;
    private activeSeries: Set<SeriesKey> | undefined;
    private csvParser: CSVParser | undefined;
    private chartDropdown: ChartDropdown;
    
    constructor(private chart: LightweightCharts.IChartApi) {
        this.seriesInstances = this.createInstances();
        // this.csvParser = new CSVParser('');

        // Initialize chart dropdown with callback to update series visibility based on user selection
        this.chartDropdown = new ChartDropdown('dropdownList', (selectedSeries) => {
            this.activeSeries?.forEach(key => 
                this.toggleSeriesVisibility(key, selectedSeries.has(key))
            );
        });
    }

    private createInstances(): SeriesInstanceMap {
        const instances = {} as SeriesInstanceMap;
        
        // Create each instance explicitly to maintain proper typing
        instances.candlestick = createCandlestickInstance(this.chart);
        instances.volume = createVolumeInstance(this.chart);
        instances.bb_upper = createLineInstance('bb_upper', this.chart);
        instances.bb_middle = createLineInstance('bb_middle', this.chart);
        instances.bb_lower = createLineInstance('bb_lower', this.chart);
        instances.dc_upper = createLineInstance('dc_upper', this.chart);
        instances.dc_middle = createLineInstance('dc_middle', this.chart);
        instances.dc_lower = createLineInstance('dc_lower', this.chart);
        instances.adx = createLineInstance('adx', this.chart);
        
        return instances;
    }

    /**
     * Retrieves all currently managed series instances.
     * @returns A readonly, partial map of series instances.
     */
    getAllInstances(): Readonly<Partial<SeriesInstanceMap>> {
        return this.seriesInstances;
    }

    /**
     * Retrieves a specific series instance by its key.
     * @param key The `SeriesKey` of the instance to retrieve.
     * @returns The `SeriesInstance` if found, otherwise `undefined`.
     */
    getSeriesInstance<K extends SeriesKey>(key: K): SeriesInstance<SeriesTypeFromKey<K>> | undefined {
        // The type assertion is to satisfy TypeScript, ensuring the correct specific instance type is returned.
        return this.seriesInstances[key] as SeriesInstance<SeriesTypeFromKey<K>> | undefined;
    }

    private clearAllSeriesData() {
        (Object.keys(this.seriesInstances) as SeriesKey[]).forEach(key => {
            this.seriesInstances[key].series.setData([]);

            //Remove legends
            this.seriesInstances[key].legendElement.remove();
        });
    }

    updateAllSeriesData(csvText: string, legendsDiv: HTMLDivElement) {
        const csvParser = new CSVParser(csvText);
        this.csvParser = csvParser;
        this.clearAllSeriesData();
        
        const rawCsvHeaders = this.csvParser.getHeaders();
        const validSeries = new Set<SeriesKey>();

        // Update validSeries: candlestick
        const allOhlcPresent = candlestickColumns.every(column => rawCsvHeaders.includes(column));
        if (allOhlcPresent) {
            validSeries.add('candlestick' as SeriesKey);
        } else {
            console.error('Candlestick data missing or incomplete')
        }

        // Update validSeries: add instances available in csv
        Object.keys(this.seriesInstances).forEach(key => {
            if (rawCsvHeaders.includes(key)) {
                validSeries.add(key as SeriesKey);
            }
        }) 

        const validIndividualSeries: SeriesItem[] = [];
        
        validSeries.forEach(seriesKey => {
            const instance = this.seriesInstances[seriesKey];
            instance.data = instance.definition.parseData(csvParser);
            instance.series.setData(instance.data);

            // Add legends elements to group div or main div
            const seriesGroup = instance.definition.group;
            if (!seriesGroup) {
                validIndividualSeries.push({
                    id: seriesKey,
                    name: instance.definition.label
                });
                legendsDiv?.appendChild(instance.legendElement);                
            } else {
                const groupDiv = predefinedGroupSeries[seriesGroup].legendElement;
                groupDiv?.appendChild(instance.legendElement);
            }
        });
        
        // Process group series with only valid series
        const validGroupSeries = Object.values(predefinedGroupSeries)
            .map(groupSeries => ({
                ...groupSeries,
                seriesItems: groupSeries.seriesItems.filter(item => validSeries.has(item.id))
            }))
            .filter(group => group.seriesItems.length > 0);

        // Update activeSeries
        this.activeSeries = validSeries;

        // Add valid group series to legendDiv
        validGroupSeries.forEach(groupSeries => {
            legendsDiv?.appendChild(groupSeries.legendElement); 
        })  
        
        // Update UI components
        this.chartDropdown.update(validIndividualSeries, validGroupSeries);
        this.addTradeEventMarkers();
    }

    // Method to format data for display with proper type handling
    formatSeriesData<K extends SeriesKey>(
        key: K, 
        dataPoint: LightweightCharts.SeriesDataItemTypeMap[SeriesTypeFromKey<K>] | LightweightCharts.WhitespaceData
    ): string {
        const instance = this.seriesInstances[key];
        return instance.definition.formatData(instance.series, dataPoint);
    }

    addTradeEventMarkers() {
        // Set trade events markers if available in data
        if (this.csvParser?.getHeaders().includes('event')) {
            const tradeSeriesMarkers = LightweightCharts.createSeriesMarkers(this.getSeriesInstance('candlestick')!.series);
            tradeSeriesMarkers.setMarkers(createTradeEventMarkers(this.csvParser.parseTradeEvents()));
        }
    }

    /**
     * Updates the legend text for a series instance with current data.
     * @template T - The series type (Candlestick, Line, etc.)
     * @param instance - The series instance to update
     * @param currentDataPoint - The current data point to display
     */
    updateLegend<K extends SeriesKey>(
        key: K,
        dataPoint?: LightweightCharts.SeriesDataItemTypeMap[SeriesTypeFromKey<K>] | LightweightCharts.WhitespaceData
    ) {
        const seriesInstance = this.seriesInstances[key];
        
        if (dataPoint) {
            // Use formatted data when dataPoint is provided
            seriesInstance.legendElement.textContent = this.formatSeriesData(key, dataPoint);
        } else {
            // Use default label from series definition when no dataPoint
            seriesInstance.legendElement.textContent = seriesInstance.definition.label;
        }
    }

    /**
     * Controls the visibility of a specific series.
     * Uses exhaustive type checking to ensure all series types are handled.
     */
    toggleSeriesVisibility(key: SeriesKey, visible: boolean): void {
        this.seriesInstances[key].series.applyOptions({ visible });
    }
}