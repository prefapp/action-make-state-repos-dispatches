const dispatcher = require('../src/dispatcher')

describe('The dispatcher', () => {
  it('can make dispatches', async () => {
    expect(dispatcher).toHaveBeenCalled()
  })
  it('can filter by dispatch type', async () => {
    expect(dispatcher).toHaveBeenCalled()
  })
  it('can filter by flavor', async () => {
    expect(dispatcher).toHaveBeenCalled()
  })
  it('can filter by repos', async () => {
    expect(dispatcher).toHaveBeenCalled()
  })
  it('can filter by environment', async () => {
    expect(dispatcher).toHaveBeenCalled()
  })
  it('can filter by tenant', async () => {
    expect(dispatcher).toHaveBeenCalled()
  })
  it('can handle a failure', async () => {
    expect(dispatcher).toHaveBeenCalled()
  })
})

