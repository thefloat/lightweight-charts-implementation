import * as lw from 'lightweight-charts';

export const SeriesSources = {
    candlestick: 'Candlestick',
    volume: 'Histogram',
    bb_upper: 'Line',
    bb_middle: 'Line',
    bb_lower: 'Line',
    dc_upper: 'Line',
    dc_middle: 'Line',
    dc_lower: 'Line',
    adx: 'Line'
} as const;

export type SeriesSources = typeof SeriesSources
export type SeriesSource = keyof SeriesSources

export const Indicators = {
    bollinger_bands: 'Bollinger Bands',
    donchian_channel: 'Donchian Channel'
} as const;

type Indicator =  keyof typeof Indicators

interface SeriesSourceConfig<TSeriesType extends lw.SeriesType> {
    label: string;
    seriesOptions: lw.SeriesPartialOptionsMap[TSeriesType];
    formatData(formatter: lw.IPriceFormatter, dataPoint: lw.SeriesDataItemTypeMap[TSeriesType]): string;
    indicator?: Indicator;
}

export const SeriesSourceConfigs: {
    [S in SeriesSource]: SeriesSourceConfig<SeriesSources[S]>
} = {
    candlestick: {
        label: 'Candlestick',
        seriesOptions: {
            borderVisible: false,
        },
        formatData(formatter, dataPoint) {
            if (!dataPoint ||
                !('open' in dataPoint) ||
                !('high' in dataPoint) ||
                !('low' in dataPoint) ||
                !('close' in dataPoint)
            ) {
                return '• O H L C';
            }

            return `• O_${formatter.format(dataPoint.open)}`
                + ` H_${formatter.format(dataPoint.high)}` 
                + ` L_${formatter.format(dataPoint.low)}` 
                + ` C_${formatter.format(dataPoint.close)}`;
        },
    },
    volume: {
        label: 'Volume',
        seriesOptions: {
            color: '#26a69a',
            priceFormat: {
                type: 'volume',
            },
            priceScaleId: '',
            priceLineVisible: false,
            lastValueVisible: false,
        },
        formatData(formatter, dataPoint) {
            if (!('value' in dataPoint)) {
                return '• V';
            }

            return `• V_${formatter.format(dataPoint.value)}`;
        },
    },
    bb_upper: {
        label: 'BB Upper',
        seriesOptions: {
            color: '#FF5733',
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
        },
        formatData(formatter, dataPoint) {
            if (!('value' in dataPoint)) {
                return '• U';
            }

            return `• U_${formatter.format(dataPoint.value)}`;
        },
        indicator: 'bollinger_bands'
    },
    bb_middle: {
        label: 'BB Middle',
        seriesOptions: {
            color: '#F2D222',
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
        },
        formatData(formatter, dataPoint) {
            if (!('value' in dataPoint)) {
                return '• M';
            }

            return `• M_${formatter.format(dataPoint.value)}`;
        },
        indicator: 'bollinger_bands'
    },
    bb_lower: {
        label: 'BB Lower',
        seriesOptions: {
            color: '#FF5733',
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
        },
        formatData(formatter, dataPoint) {
            if (!('value' in dataPoint)) {
                return '• L';
            }

            return `• L_${formatter.format(dataPoint.value)}`
        },
        indicator: 'bollinger_bands'
    },
    dc_upper: {
        label: 'DC Upper',
        seriesOptions: {
            color: '#3380FF',
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
        },
        formatData(formatter, dataPoint) {
            if (!('value' in dataPoint)) {
                return '• U';
            }

            return `• U_${formatter.format(dataPoint.value)}`;
        },
        indicator: 'donchian_channel'
    },
    dc_middle: {
        label: 'DC Middle',
        seriesOptions: {
            color: '#22F2D2',
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
        },
        formatData(formatter, dataPoint) {
            if (!('value' in dataPoint)) {
                return '• M';
            }

            return `• M_${formatter.format(dataPoint.value)}`;
        },
        indicator: 'donchian_channel'
    },
    dc_lower: {
        label: 'DC Lower',
        seriesOptions: {
            color: '#3380FF',
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
        },
        formatData(formatter, dataPoint) {
            if (!('value' in dataPoint)) {
                return '• L';
            }

            return `• L_${formatter.format(dataPoint.value)}`;
        },
        indicator: 'donchian_channel'
    },
    adx: {
        label: 'ADX',
        seriesOptions: {
            color: '#3380FF',
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
        },
        formatData(formatter, dataPoint) {
            if (!('value' in dataPoint)) {
                return '• ADX';
            }

            return `• ADX_${formatter.format(dataPoint.value)}`;
        }
    }
} as const;