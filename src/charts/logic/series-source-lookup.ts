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
    adx: 'Line',
    plusDi: 'Line',
    minusDi: 'Line',
    aer: 'Line',
    atr: 'Line',
} as const;

export type SeriesSources = typeof SeriesSources
export type SeriesSource = keyof SeriesSources

export const Indicators = {
    bollinger_bands: 'Bollinger Bands',
    donchian_channel: 'Donchian Channel',
    dmi: 'DMI'
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
                return '• O • H • L • C';
            }

            return `• O_${formatter.format(dataPoint.open)}`
                + ` • H_${formatter.format(dataPoint.high)}` 
                + ` • L_${formatter.format(dataPoint.low)}` 
                + ` • C_${formatter.format(dataPoint.close)}`;
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
            color: '#87312b', // red
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
            color: '#9e9e00',
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
            color: '#87312b',
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
            color: '#181577', //blue
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
            color: '#273186',
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
            color: '#181577',
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
            color: '#9e6500', //orange
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
        },
        formatData(formatter, dataPoint) {
            if (!('value' in dataPoint)) {
                return '• ADX';
            }

            return `• ADX_${formatter.format(dataPoint.value)}`;
        },
        indicator: 'dmi'
    },
    plusDi: {
        label: '+DI',
        seriesOptions: {
            color: '#ffaf3e',
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
        },
        formatData(formatter, dataPoint) {
            if (!('value' in dataPoint)) {
                return '• +DI';
            }

            return `• +DI_${formatter.format(dataPoint.value)}`;
        },
        indicator: 'dmi'
    },
    minusDi: {
        label: '-DI',
        seriesOptions: {
            color: '#ffe5c6',
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
        },
        formatData(formatter, dataPoint) {
            if (!('value' in dataPoint)) {
                return '• -DI';
            }

            return `• -DI_${formatter.format(dataPoint.value)}`;
        },
        indicator: 'dmi'
    },
    aer: {
        label: 'AER',
        seriesOptions: {
            color: '#00ff00', //green
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
        },
        formatData(formatter, dataPoint) {
            if (!('value' in dataPoint)) {
                return '• AER';
            }

            return `• AER_${formatter.format(dataPoint.value)}`;
        },
    },
    atr: {
        label: 'ATR',
        seriesOptions: {
            color: '#00ff00', // purple
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
        },
        formatData(formatter, dataPoint) {
            if (!('value' in dataPoint)) {
                return '• ATR';
            }

            return `• ATR_${formatter.format(dataPoint.value)}`;
        },
    },
} as const;