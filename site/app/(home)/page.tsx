import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col justify-center text-center">
      <h1 className="mb-4 text-2xl font-bold">IFLoom</h1>
      <p>
        <Link href="/docs/guide/introduction" className="font-medium underline">
          Read the docs
        </Link>
      </p>
    </main>
  )
}
