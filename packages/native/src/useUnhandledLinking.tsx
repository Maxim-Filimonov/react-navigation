import {
  getStateFromPath,
  NavigationProp,
  ResultState,
  useNavigation,
} from '@react-navigation/core';
import React from 'react';
import { Platform } from 'react-native';
import useLatestCallback from 'use-latest-callback';

import { extractPathFromURL } from './extractPathFromURL';
import { LinkingContext } from './LinkingContext';

function extractNavigatorSpecifcState(
  navigation: NavigationProp<ReactNavigation.RootParamList>,
  rootState: ResultState
) {
  let state: typeof rootState | undefined = rootState;

  const parent = navigation.getParent();
  if (parent) {
    // Then, we consider a portion of the state.
    const parentState = parent.getState();
    const outerRouteName = parentState.routes[parentState.index].name;
    while (state && state.routes[state.index ?? 0].name !== outerRouteName) {
      state = state.routes[state.index ?? 0].state;
    }
    if (!state) {
      return;
    }
    const innerState = state.routes[state.index ?? 0].state;
    if (!innerState) {
      return;
    }
    state = innerState;
  }
  return state;
}

export function useUnhandledLinking() {
  const navigation = useNavigation();
  const linking = React.useContext(LinkingContext);

  const { options, lastUnhandledLinking } = linking;

  /*
   * Function to handle last unhandled URL. This function has to be called when the conditional
   * rendering of the navigator is about to happen e.g. in the `onPress` of a log in button.
   */
  const handleLastLinking = () => {
    if (options == null || lastUnhandledLinking?.current == null) {
      // noop, nothing to handle
      return;
    }

    const { config, prefixes } = options;

    // at web, the path is already extracted
    const path = Platform.select({
      default: extractPathFromURL(prefixes, lastUnhandledLinking.current),
      web: lastUnhandledLinking.current,
    });

    // First, we parse the URL to get the desired state
    const getStateFromPathHelper =
      options?.getStateFromPath ?? getStateFromPath;

    const rootState = getStateFromPathHelper(path ?? '', config);

    if (!rootState) {
      return;
    }
    const state = extractNavigatorSpecifcState(navigation, rootState);

    // Once we have the state, we can tell React Navigation to use it for next route names change (conditional rendering logic change)
    // @ts-expect-error: this is ok
    navigation.setStateForNextRouteNamesChange(state);

    // Finally, we clear unhandled link after it was handled
    lastUnhandledLinking.current = undefined;
  };

  const getUnhandledLink = useLatestCallback(
    () => lastUnhandledLinking.current
  );

  return { handleLastLinking, getUnhandledLink };
}
