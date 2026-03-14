import { useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

export function App() {
  const [count, setCount] = useState(0)
  const [query, setQuery] = useState("")
  const [checked, setChecked] = useState(true)

  return (
    <main className="min-h-svh bg-background">
      <section className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10">
        <div className="flex flex-col gap-3">
          <Badge variant="outline" className="w-fit">
            shadcn/ui default-style demo
          </Badge>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">shadcn.min.js</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              这是用于对比原生实现与单文件打包实现的同款示例，没有改默认主题，只使用组件本身的样式语言。
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>组件预览</CardTitle>
              <CardDescription>直接使用同一套 shadcn 组件与默认 token。</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="form">Form</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6 space-y-6">
                  <Alert>
                    <AlertTitle>真正的默认风格</AlertTitle>
                    <AlertDescription>
                      这里没有改写 shadcn 的默认配色和圆角比例，只是把组件直接组合起来。
                    </AlertDescription>
                  </Alert>

                  <div className="flex flex-wrap gap-3">
                    <Button onClick={() => setCount((value) => value + 1)}>Primary</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="outline" onClick={() => setCount(0)}>
                      Reset
                    </Button>
                    <Button variant="ghost">Ghost</Button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    {[
                      { label: "Counter", value: String(count) },
                      { label: "Bundle", value: "single js" },
                      { label: "Exports", value: "flat named" },
                    ].map((item) => (
                      <div key={item.label} className="rounded-lg border p-4">
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className="mt-2 text-2xl font-semibold tracking-tight">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="form" className="mt-6 space-y-5">
                  <div className="grid gap-2">
                    <Label htmlFor="shadcn-query">Keyword</Label>
                    <Input
                      id="shadcn-query"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search components"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="shadcn-message">Message</Label>
                    <Textarea
                      id="shadcn-message"
                      placeholder="Describe what you want to preview."
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="shadcn-defaults"
                      checked={checked}
                      onCheckedChange={(value) => setChecked(Boolean(value))}
                    />
                    <Label htmlFor="shadcn-defaults">Keep default shadcn styles</Label>
                  </div>

                  <Button className="w-fit">Submit</Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <div className="min-w-0 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>当前状态</CardTitle>
                <CardDescription>这些也是页面里实际使用到的组件。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge>{`count: ${count}`}</Badge>
                  <Badge variant="secondary">{checked ? "defaults on" : "defaults off"}</Badge>
                  <Badge variant="outline">{query || "no keyword"}</Badge>
                </div>
                <Separator />
                <p className="text-sm text-muted-foreground">
                  这里用的是默认的 Card、Badge、Button、Input、Textarea、Tabs、Checkbox、Alert 和
                  Separator 组合，没有自己重画一套设计。
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>导入方式</CardTitle>
                <CardDescription>这里展示同一份导入示意文本，便于直接比较视觉结果。</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="overflow-x-auto rounded-md border bg-muted p-4 text-sm">
                  <code>{`import { Button, Card, Input, Tabs } from "shadcn";`}</code>
                </pre>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
