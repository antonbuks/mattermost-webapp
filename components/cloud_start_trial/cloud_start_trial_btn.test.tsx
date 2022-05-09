// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {ReactWrapper, shallow} from 'enzyme';

import configureStore from 'redux-mock-store';

import {Provider} from 'react-redux';

import thunk from 'redux-thunk';

import {act} from 'react-dom/test-utils';

import {mountWithIntl} from 'tests/helpers/intl-test-helper';

import {trackEvent} from 'actions/telemetry_actions.jsx';

import {TELEMETRY_CATEGORIES} from 'utils/constants';

import CloudStartTrialBtn from './cloud_start_trial_btn';

jest.mock('actions/telemetry_actions.jsx', () => {
    const original = jest.requireActual('actions/telemetry_actions.jsx');
    return {
        ...original,
        trackEvent: jest.fn(),
    };
});

jest.mock('mattermost-redux/actions/general', () => ({
    ...jest.requireActual('mattermost-redux/actions/general'),
    getLicenseConfig: () => ({type: 'adsf'}),
}));

describe('components/learn_more_trial_modal/start_trial_btn', () => {
    const state = {
        entities: {
            admin: {},
            general: {
                license: {
                    IsLicensed: 'true',
                    Cloud: 'true',
                },
            },
            cloud: {
                subscription: {
                    is_free_trial: 'false',
                    trial_end_at: 0,
                },
            },
        },
        views: {
            modals: {
                modalState: {
                    learn_more_trial_modal: {
                        open: 'true',
                    },
                },
            },
        },
    };

    const mockStore = configureStore([thunk]);
    const store = mockStore(state);

    const props = {
        onClick: jest.fn(),
        message: 'Cloud Start trial',
        telemetryId: 'test_telemetry_id',
    };

    test('should match snapshot', () => {
        const wrapper = shallow(
            <Provider store={store}>
                <CloudStartTrialBtn {...props}/>
            </Provider>,
        );
        expect(wrapper).toMatchSnapshot();
    });

    test('should handle on click', async () => {
        const mockOnClick = jest.fn();

        let wrapper: ReactWrapper<any>;

        // Mount the component
        await act(async () => {
            wrapper = mountWithIntl(
                <Provider store={store}>
                    <CloudStartTrialBtn
                        {...props}
                        onClick={mockOnClick}
                    />
                </Provider>,
            );
        });

        await act(async () => {
            wrapper.find('.CloudStartTrialBtn').simulate('click');
        });

        expect(mockOnClick).toHaveBeenCalled();

        expect(trackEvent).toHaveBeenCalledWith(TELEMETRY_CATEGORIES.CLOUD_START_TRIAL_MODAL, 'test_telemetry_id');
    });
});
