export interface SvgParseResult {
  type: string
  children: Children[]
}

export interface Children {
  type: string
  tagName: string
  properties: Record<string, string>
  children: Children[]
  metadata?: string
}
