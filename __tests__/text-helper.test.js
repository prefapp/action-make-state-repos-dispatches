const fs = require('fs')
const textHelper = require('../utils/text-helper')
const yamlContent = `
---
test:
  key: value
`
const strEncodeUTF16 = str => {
  const arr = []
  for (let i = 0; i < str.length; i++) {
    arr[i] = str.charCodeAt(i)
  }
  return arr
}

describe('The text helper', () => {
  it('can parse a YAML file', () => {
    const result = textHelper.parseFile(yamlContent)

    expect(result['test']['key']).toEqual('value')
  })

  it('can parse a non-utf8 encoded YAML file', () => {
    const result = textHelper.parseFile(strEncodeUTF16(yamlContent), 'utf-16')

    expect(result['test']['key']).toEqual('value')
  })

  it("throws an error when the input can't be parsed", () => {
    expect(() => {
      textHelper.parseFile(12345)
    }).toThrow('Error parsing YAML file:')
  })
})
