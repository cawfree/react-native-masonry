import React from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
} from 'react-native';
import PropTypes from 'prop-types';

class PropsMasonry extends React.Component {
  constructor(nextProps) {
    super(nextProps);
    this.state = ({
      items: {
        // XXX: Entries look like this:
        // [key]: { column, height },
      },
    });
    this.__getColumnHeights = this.__getColumnHeights.bind(this);
    this.__onLayout = this.__onLayout.bind(this);
  }
  __getKeysByColumn(nextProps, nextState, column) {
    const {
      items,
    } = nextState;
    return Object.entries(
      items
    )
    .filter((entry) => {
      const value = entry[1];
      return value && value.height > 0 && value.column === column;
    })
    .map((entry) => entry[0]);
  }
  __getItemsByColumn(nextProps, nextState, column) {
    const columnKeys = this.__getKeysByColumn(
      nextProps,
      nextState,
      column,
    );
    return nextProps
      .items
      .filter(
        ({ key }) => (columnKeys.indexOf(key) >= 0),
      );
  }
  __getColumnHeights(nextProps, nextState) {
    const {
      columns,
    } = nextProps;
    const {
      // TODO: What if columns dont exist
      items,
    } = nextState;
    return [...Array(columns)]
      .map((column, index) => {
        const columnKeys = this.__getKeysByColumn(
          nextProps,
          nextState,
          // TODO: Column itself should be the index.
          index,
        );
        return columnKeys
          .reduce(
            (columnHeight, columnKey) => {
              // XXX: Accumulate the total item heights belonging to
              //      the column; this gives the column height.
              return columnHeight + items[columnKey].height;
            },
            0,
          );
      });
  }
  __getKeysPendingEvaluation(nextProps, nextState) {
    const {
      items,
    } = nextState;
    const evaluatedKeys = Object.keys(items);
    return nextProps
      .items
      .filter(({ key }) => evaluatedKeys.indexOf(key) < 0);
  }
  // XXX: When the element pendingEvaluation has finished laying
  //      out, we know how tall it is. We trigger a re-render using
  //      its known height, which determines which column it is placed
  //      into. After re-rendering, a new element pendingEvaluation is
  //      rendered in the DOM, which causes the process to iterate again.
  __onLayout(e, key) {
    const {
      height,
    } = e.nativeEvent.layout;
    const {
      onItemPlaced,
    } = this.props;
    this.requestAnimationFrame(() => {
      const {
        items,
      } = this.state;
      const heights = this.__getColumnHeights(
        this.props,
        this.state,
      );
      const item = this.props.items
        .filter((item) => item.key === key)[0];
      const parentKeys = this.props.items
        .map(({ key }) => key);
      const minHeight = Math.min(...heights);
      const column = heights.indexOf(minHeight);
      this.setState(
        {
          // XXX: Here, alongside updating the item position,
          //      we also clean out any keys which are no longer
          //      referenced by the parent.
          items: Object.entries({
            ...items,
            [key]: {
              height,
              column,
            },
          })
            .filter((entry) => {
              return parentKeys.indexOf(entry[0]) >= 0;
            })
            .reduce(
              (obj, entry) => {
                return ({
                  ...obj,
                  [entry[0]]: entry[1],
                });
              },
              {},
            ),
        },
        () => {
          return onItemPlaced(
            item,
          );
        },
      );
    });
  }
  render() {
    const {
      style,
      items,
      columns,
      renderItem,
      ScrollComponent,
      onItemPlaced,
      ...nextProps
    } = this.props;
    const {

    } = this.state;
    // XXX: The next item to determine render height; items
    //      are appended to the columns with the smallest
    //      accumulated height.
    const pendingEvaluation = this.__getKeysPendingEvaluation(
      this.props,
      this.state,
    )[0];
    return (
      <ScrollComponent
        style={style || {}}
        {...nextProps}
      >
        <View
          style={styles.container}
        >
          <View
            style={styles.bufferContainer}
          >
            {(!!pendingEvaluation) && ([... Array(columns)]).map(
              (column, index) => {
                if (index === 0) {
                  return (
                    <View
                      key={`eval(${pendingEvaluation.key})`}
                      style={styles.buffer}
                      onLayout={e => this.__onLayout(e, pendingEvaluation.key)}
                    >
                      {renderItem(pendingEvaluation)}
                    </View>
                  );
                }
                return null;
              },
            )}
          </View>
          {([...Array(columns)]).map(
            (column, index) => {
              const itemsInColumn = this.__getItemsByColumn(
                this.props,
                this.state,
                // XXX: This must be the columnId.
                index,
              );
              return (
                <View
                  style={styles.column}
                >
                  {itemsInColumn.map((item) => {
                    const {
                      height,
                      ...extraProps
                    } = this.state.items[item.key];
                    return (
                      <View
                        style={{
                          flexDirection: 'row',
                          height,
                        }}
                      >
                        {renderItem(item)}
                      </View>
                    );
                  })} 
                </View>
              );
            },
          )}
        </View>
      </ScrollComponent>
    );
  }
}

Object.assign(
  PropsMasonry.prototype,
  require('react-timer-mixin'),
);

PropsMasonry.propTypes = {
  columns: PropTypes.number,
  renderItem: PropTypes.func.isRequired,
  ScrollComponent: PropTypes.shape({}),
  containerStyle: PropTypes.func,
  onCreate: PropTypes.func,
};

PropsMasonry.defaultProps = {
  columns: 2,
  items: [],
  ScrollComponent: ScrollView,
  onItemPlaced: (item) => {
    // XXX: Here, you can perform item-specific
    //      entry animation, if the animatable
    //      props are part of the item object.
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  column: {
    flex: 1,
  },
  buffer: {
    flex: 1,
    flexDirection: 'row',
  },
  // XXX: Used to layout elements and determine their height
  //      before deciding which column to add them to.
  bufferContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    opacity: 0,
  },
});

export default PropsMasonry;
