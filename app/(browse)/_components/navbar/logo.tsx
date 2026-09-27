import Image from "next/image";
import Link from "next/link";

export  function Logo () {
    return (
        <Link href='/'>
            <div className="hidden lg:flex items-end gap-x-4 hover:opacity-75 transition">
                <div className="bg-white rounded-full p-1">
                    <Image
                     src='/SD-LAB.png'
                     width='32'
                     height='32'
                     alt='SD LAB'
                    />
                </div>
                <p className="font-semibold text-lg">SD LAB</p>
            </div>
        </Link>
    )
}
