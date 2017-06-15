import View from './Editor.view.js'
import React from 'react'

export default class Editor extends React.Component {
  state = {
    tab: 'view',
  }

  showLogic = () => this.setState({ tab: 'logic' })
  showTests = () => this.setState({ tab: 'tests' })
  showView = () => this.setState({ tab: 'view' })
  showViewJs = () => this.setState({ tab: 'viewjs' })

  render() {
    const { tab } = this.state

    return (
      <View
        showLogic={this.showLogic}
        showTests={this.showTests}
        showView={this.showView}
        showViewJs={this.showViewJs}
        showingLogic={tab === 'logic'}
        showingTests={tab === 'tests'}
        showingView={tab === 'view'}
        showingViewJs={tab === 'viewjs'}
        tab={tab}
      />
    )
  }
}